import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/permissions";
import { ApiError, readJson, route } from "@/lib/api-helpers";
import { publish } from "@/lib/events";

type Ctx = { params: Promise<{ taskId: string }> };
const schema = z.object({ listId: z.string().min(1) });

export const POST = route(async (req, { params }: Ctx) => {
  const { taskId } = await params;
  const { user } = await requireRole("MEMBER");
  const { listId: targetListId } = await readJson(req, schema);

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { listId: true, parentId: true },
  });
  if (!task) throw new ApiError(404, "Task not found");
  if (task.parentId) throw new ApiError(400, "Move the parent task instead of a subtask");
  if (task.listId === targetListId) return NextResponse.json({ ok: true, listId: targetListId });

  const target = await prisma.list.findUnique({ where: { id: targetListId }, select: { id: true, name: true } });
  if (!target) throw new ApiError(404, "Target list not found");
  const firstStatus = await prisma.status.findFirst({ where: { listId: targetListId }, orderBy: { position: "asc" } });
  if (!firstStatus) throw new ApiError(400, "Target list has no statuses");

  const last = await prisma.task.findFirst({
    where: { listId: targetListId, parentId: null },
    orderBy: { position: "desc" },
  });

  const oldListId = task.listId;
  await prisma.$transaction([
    // custom field values are list-specific — drop them for the task and its subtasks
    prisma.customFieldValue.deleteMany({ where: { taskId } }),
    prisma.customFieldValue.deleteMany({ where: { task: { parentId: taskId } } }),
    prisma.task.update({
      where: { id: taskId },
      data: { listId: targetListId, statusId: firstStatus.id, position: (last?.position ?? 0) + 1000 },
    }),
    // subtasks follow the parent; remap their status to the target's first status
    prisma.task.updateMany({
      where: { parentId: taskId },
      data: { listId: targetListId, statusId: firstStatus.id },
    }),
    prisma.activity.create({
      data: { taskId, userId: user.id, type: "moved", data: { toList: target.name } },
    }),
  ]);

  publish({ type: "list", listId: oldListId });
  publish({ type: "list", listId: targetListId });
  return NextResponse.json({ ok: true, listId: targetListId });
});
