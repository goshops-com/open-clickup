import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ApiError, readJson, route } from "@/lib/api-helpers";
import { publish } from "@/lib/events";

type Ctx = { params: Promise<{ taskId: string }> };

const schema = z.object({
  type: z.enum(["waiting_on", "blocking"]),
  otherTaskId: z.string().min(1),
});

export const POST = route(async (req, { params }: Ctx) => {
  const { taskId } = await params;
  await requireUser();
  const { type, otherTaskId } = await readJson(req, schema);

  if (otherTaskId === taskId) throw new ApiError(400, "A task can't depend on itself");

  // "waiting_on": this task waits on other → blocker = other, blocked = this
  // "blocking":   this task blocks other  → blocker = this,  blocked = other
  const blockerId = type === "waiting_on" ? otherTaskId : taskId;
  const blockedId = type === "waiting_on" ? taskId : otherTaskId;

  const [task, other] = await Promise.all([
    prisma.task.findUnique({ where: { id: taskId }, select: { listId: true } }),
    prisma.task.findUnique({ where: { id: otherTaskId }, select: { id: true } }),
  ]);
  if (!task) throw new ApiError(404, "Task not found");
  if (!other) throw new ApiError(404, "Linked task not found");

  // reject the reverse edge (would create an immediate cycle)
  const reverse = await prisma.taskDependency.findUnique({
    where: { blockerId_blockedId: { blockerId: blockedId, blockedId: blockerId } },
  });
  if (reverse) throw new ApiError(409, "That would create a circular dependency");

  const existing = await prisma.taskDependency.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
  if (existing) throw new ApiError(409, "Dependency already exists");

  const dep = await prisma.taskDependency.create({ data: { blockerId, blockedId } });
  publish({ type: "list", listId: task.listId });
  return NextResponse.json(dep, { status: 201 });
});
