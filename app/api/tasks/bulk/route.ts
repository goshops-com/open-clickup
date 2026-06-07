import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { Priority } from "@/lib/generated/prisma/client";
import { readJson, route } from "@/lib/api-helpers";
import { publish } from "@/lib/events";

async function notifyLists(ids: string[]) {
  const tasks = await prisma.task.findMany({ where: { id: { in: ids } }, select: { listId: true } });
  for (const listId of new Set(tasks.map((t) => t.listId))) publish({ type: "list", listId });
}

const schema = z.object({
  ids: z.array(z.string()).min(1, "ids[] required"),
  delete: z.boolean().optional(),
  patch: z
    .object({
      statusId: z.string().optional(),
      priority: z.enum(["URGENT", "HIGH", "NORMAL", "LOW"]).nullish(),
      assigneeIds: z.array(z.string()).optional(),
    })
    .optional(),
});

export const POST = route(async (req) => {
  const { ids, patch, delete: del } = await readJson(req, schema);

  if (del) {
    await notifyLists(ids); // resolve listIds before the rows are gone
    await prisma.task.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ ok: true, deleted: ids.length });
  }

  if (patch?.statusId || patch?.priority !== undefined) {
    const data: Record<string, unknown> = {};
    if (patch.statusId) {
      data.statusId = patch.statusId;
      const st = await prisma.status.findUnique({ where: { id: patch.statusId } });
      data.completedAt = st?.type === "DONE" ? new Date() : null;
    }
    if (patch.priority !== undefined) data.priority = patch.priority as Priority | null;
    await prisma.task.updateMany({ where: { id: { in: ids } }, data });
  }

  if (patch?.assigneeIds) {
    await prisma.$transaction([
      prisma.taskAssignee.deleteMany({ where: { taskId: { in: ids } } }),
      prisma.taskAssignee.createMany({
        data: ids.flatMap((taskId) =>
          patch.assigneeIds!.map((userId) => ({ taskId, userId })),
        ),
        skipDuplicates: true,
      }),
    ]);
  }

  await notifyLists(ids);
  return NextResponse.json({ ok: true, updated: ids.length });
});
