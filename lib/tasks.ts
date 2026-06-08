import { prisma } from "@/lib/db";
import { Priority, Prisma } from "@/lib/generated/prisma/client";
import { taskInclude } from "@/lib/queries";
import { publish } from "@/lib/events";
import { createNotifications } from "@/lib/notifications";
import { nextOccurrence, type Recurrence } from "@/lib/recurrence";

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
  recurrence?: string | null;
  archived?: boolean;
  assigneeIds?: string[]; // full replacement set
  tagIds?: string[]; // full replacement set
  watcherIds?: string[]; // full replacement set
};

export async function updateTask(taskId: string, patch: TaskPatch, actorId?: string) {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignees: true, tags: true, watchers: true, status: true },
  });
  if (!existing) throw new Error("Task not found");

  const data: Record<string, unknown> = {};
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.priority !== undefined) data.priority = patch.priority;
  if (patch.position !== undefined) data.position = patch.position;
  if (patch.timeEstimate !== undefined) data.timeEstimate = patch.timeEstimate;
  if (patch.recurrence !== undefined) data.recurrence = patch.recurrence || null;
  if (patch.archived !== undefined) data.archived = patch.archived;
  if (patch.startDate !== undefined)
    data.startDate = patch.startDate ? new Date(patch.startDate) : null;
  if (patch.dueDate !== undefined)
    data.dueDate = patch.dueDate ? new Date(patch.dueDate) : null;

  // collect activity-log entries for changes worth an audit trail
  const activityLog: { type: string; data: Record<string, unknown> }[] = [];
  if (patch.name !== undefined && patch.name !== existing.name) {
    activityLog.push({ type: "renamed", data: { name: patch.name } });
  }
  if (patch.priority !== undefined && patch.priority !== existing.priority) {
    activityLog.push({ type: "priority_changed", data: { priority: patch.priority } });
  }
  if (patch.dueDate !== undefined) {
    const newDue = patch.dueDate ? new Date(patch.dueDate).toISOString() : null;
    const oldDue = existing.dueDate ? existing.dueDate.toISOString() : null;
    if (newDue !== oldDue) activityLog.push({ type: "due_changed", data: { dueDate: newDue } });
  }

  // status change → set completedAt + log
  let becameDone = false;
  if (patch.statusId !== undefined && patch.statusId !== existing.statusId) {
    data.statusId = patch.statusId;
    const newStatus = await prisma.status.findUnique({ where: { id: patch.statusId } });
    becameDone = newStatus?.type === "DONE";
    data.completedAt = becameDone ? new Date() : null;
    activityLog.push({ type: "status_changed", data: { fromId: existing.statusId, toId: patch.statusId } });
  }

  // assignees full-set replacement
  let addedAssignees: string[] = [];
  if (patch.assigneeIds !== undefined) {
    const current = new Set(existing.assignees.map((a) => a.userId));
    const next = new Set(patch.assigneeIds);
    const toAdd = [...next].filter((id) => !current.has(id));
    addedAssignees = toAdd;
    const toRemove = [...current].filter((id) => !next.has(id));
    if (toAdd.length) activityLog.push({ type: "assignee_added", data: { userIds: toAdd } });
    if (toRemove.length) activityLog.push({ type: "assignee_removed", data: { userIds: toRemove } });
    data.assignees = {
      deleteMany: toRemove.length ? { userId: { in: toRemove } } : undefined,
      create: toAdd.map((userId) => ({ userId })),
    };
  }

  // watchers full-set replacement
  if (patch.watcherIds !== undefined) {
    const current = new Set(existing.watchers.map((w) => w.userId));
    const next = new Set(patch.watcherIds);
    const toAdd = [...next].filter((id) => !current.has(id));
    const toRemove = [...current].filter((id) => !next.has(id));
    data.watchers = {
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

  if (activityLog.length) {
    await prisma.activity.createMany({
      data: activityLog.map((a) => ({ taskId, userId: actorId, type: a.type, data: a.data as Prisma.InputJsonValue })),
    });
  }

  // completing a recurring task spawns the next occurrence
  if (becameDone && existing.recurrence) {
    await spawnNextOccurrence(existing, actorId);
  }

  publish({ type: "list", listId: existing.listId });

  if (addedAssignees.length && actorId) {
    await createNotifications({
      recipientIds: addedAssignees,
      actorId,
      taskId,
      type: "assigned",
      body: "assigned you a task",
    });
  }
  return task;
}

type RecurringSource = {
  listId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  priority: Priority | null;
  startDate: Date | null;
  dueDate: Date | null;
  timeEstimate: number | null;
  recurrence: string | null;
  assignees: { userId: string }[];
  tags: { tagId: string }[];
};

/** Clone a completed recurring task as a fresh open task with advanced dates. */
async function spawnNextOccurrence(src: RecurringSource, actorId?: string) {
  const rule = src.recurrence as Recurrence;
  const base = src.dueDate ?? new Date();
  const dueDate = nextOccurrence(base, rule);
  const startDate = src.startDate ? nextOccurrence(src.startDate, rule) : null;

  const firstStatus = await prisma.status.findFirst({
    where: { listId: src.listId },
    orderBy: { position: "asc" },
  });
  if (!firstStatus) return;

  const last = await prisma.task.findFirst({
    where: { listId: src.listId, parentId: src.parentId ?? null },
    orderBy: { position: "desc" },
  });

  await prisma.task.create({
    data: {
      listId: src.listId,
      statusId: firstStatus.id,
      parentId: src.parentId,
      name: src.name,
      description: src.description,
      priority: src.priority,
      position: (last?.position ?? 0) + 1000,
      startDate,
      dueDate,
      timeEstimate: src.timeEstimate,
      recurrence: src.recurrence,
      createdById: actorId,
      assignees: src.assignees.length
        ? { create: src.assignees.map((a) => ({ userId: a.userId })) }
        : undefined,
      tags: src.tags.length ? { create: src.tags.map((t) => ({ tagId: t.tagId })) } : undefined,
    },
  });
}
