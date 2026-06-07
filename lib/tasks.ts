import { prisma } from "@/lib/db";
import { Priority } from "@/lib/generated/prisma/client";
import { taskInclude } from "@/lib/queries";
import { publish } from "@/lib/events";

export async function createTask(input: {
  listId: string;
  name: string;
  statusId?: string;
  parentId?: string | null;
  priority?: Priority | null;
  assigneeIds?: string[];
  createdById?: string;
}) {
  // resolve status (default = first status of the list)
  let statusId = input.statusId;
  if (!statusId) {
    const first = await prisma.status.findFirst({
      where: { listId: input.listId },
      orderBy: { position: "asc" },
    });
    if (!first) throw new Error("List has no statuses");
    statusId = first.id;
  }

  // position at end of its group
  const last = await prisma.task.findFirst({
    where: { listId: input.listId, parentId: input.parentId ?? null },
    orderBy: { position: "desc" },
  });
  const position = (last?.position ?? 0) + 1000;

  const task = await prisma.task.create({
    data: {
      listId: input.listId,
      statusId,
      parentId: input.parentId ?? null,
      name: input.name,
      priority: input.priority ?? null,
      position,
      createdById: input.createdById,
      assignees: input.assigneeIds?.length
        ? { create: input.assigneeIds.map((userId) => ({ userId })) }
        : undefined,
    },
    include: taskInclude,
  });

  await prisma.activity.create({
    data: { taskId: task.id, userId: input.createdById, type: "created", data: {} },
  });

  publish({ type: "list", listId: input.listId });
  return task;
}

export type TaskPatch = {
  name?: string;
  description?: string | null;
  statusId?: string;
  priority?: Priority | null;
  position?: number;
  startDate?: string | null;
  dueDate?: string | null;
  timeEstimate?: number | null;
  archived?: boolean;
  assigneeIds?: string[]; // full replacement set
  tagIds?: string[]; // full replacement set
};

export async function updateTask(taskId: string, patch: TaskPatch, actorId?: string) {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: true, tags: true, status: true },
  });
  if (!existing) throw new Error("Task not found");

  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.priority !== undefined) data.priority = patch.priority;
  if (patch.position !== undefined) data.position = patch.position;
  if (patch.timeEstimate !== undefined) data.timeEstimate = patch.timeEstimate;
  if (patch.archived !== undefined) data.archived = patch.archived;
  if (patch.startDate !== undefined)
    data.startDate = patch.startDate ? new Date(patch.startDate) : null;
  if (patch.dueDate !== undefined)
    data.dueDate = patch.dueDate ? new Date(patch.dueDate) : null;

  // status change → set completedAt + log
  let statusChanged: { fromId: string; toId: string } | null = null;
  if (patch.statusId !== undefined && patch.statusId !== existing.statusId) {
    data.statusId = patch.statusId;
    const newStatus = await prisma.status.findUnique({ where: { id: patch.statusId } });
    data.completedAt = newStatus?.type === "DONE" ? new Date() : null;
    statusChanged = { fromId: existing.statusId, toId: patch.statusId };
  }

  // assignees full-set replacement
  if (patch.assigneeIds !== undefined) {
    const current = new Set(existing.assignees.map((a) => a.userId));
    const next = new Set(patch.assigneeIds);
    const toAdd = [...next].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !next.has(id));
    data.assignees = {
      deleteMany: toRemove.length ? { userId: { in: toRemove } } : undefined,
      create: toAdd.map((userId) => ({ userId })),
    };
  }

  // tags full-set replacement
  if (patch.tagIds !== undefined) {
    const current = new Set(existing.tags.map((t) => t.tagId));
    const next = new Set(patch.tagIds);
    const toAdd = [...next].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !next.has(id));
    data.tags = {
      deleteMany: toRemove.length ? { tagId: { in: toRemove } } : undefined,
      create: toAdd.map((tagId) => ({ tagId })),
    };
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data,
    include: taskInclude,
  });

  if (statusChanged) {
    await prisma.activity.create({
      data: {
        taskId,
        userId: actorId,
        type: "status_changed",
        data: statusChanged,
      },
    });
  }

  publish({ type: "list", listId: existing.listId });
  return task;
}
