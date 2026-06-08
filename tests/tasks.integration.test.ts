import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { createTask, updateTask } from "@/lib/tasks";

// Service-layer integration tests against a real Postgres (the CI build job
// provides one). Each run builds its own isolated workspace and tears it down.

let userId: string;
let listId: string;
const status: Record<string, string> = {}; // type -> id

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `itest-${Date.now()}@example.com`, name: "Integration Tester" },
  });
  userId = user.id;

  const workspace = await prisma.workspace.create({ data: { name: "ITest WS" } });
  await prisma.workspaceMember.create({
    data: { workspaceId: workspace.id, userId, role: "OWNER" },
  });
  const space = await prisma.space.create({ data: { workspaceId: workspace.id, name: "ITest Space" } });
  const list = await prisma.list.create({ data: { spaceId: space.id, name: "ITest List" } });
  listId = list.id;

  const defs: [string, "NOT_STARTED" | "ACTIVE" | "DONE" | "CLOSED"][] = [
    ["To Do", "NOT_STARTED"],
    ["In Progress", "ACTIVE"],
    ["Done", "DONE"],
    ["Closed", "CLOSED"],
  ];
  for (let i = 0; i < defs.length; i++) {
    const s = await prisma.status.create({
      data: { listId, name: defs[i][0], type: defs[i][1], position: i },
    });
    status[defs[i][1]] = s.id;
  }
});

afterAll(async () => {
  // delete the workspace (cascades space → list → tasks → activities, etc.)
  const list = await prisma.list.findUnique({ where: { id: listId }, select: { space: { select: { workspaceId: true } } } });
  if (list) await prisma.workspace.delete({ where: { id: list.space.workspaceId } }).catch(() => {});
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
});

describe("createTask", () => {
  it("defaults to the list's first status and logs a 'created' activity", async () => {
    const task = await createTask({ listId, name: "Created task", createdById: userId });
    expect(task.statusId).toBe(status.NOT_STARTED);
    const activities = await prisma.activity.findMany({ where: { taskId: task.id } });
    expect(activities.map((a) => a.type)).toContain("created");
  });
});

describe("updateTask status change", () => {
  it("sets completedAt and logs status_changed when moved to a DONE status", async () => {
    const task = await createTask({ listId, name: "Status task", createdById: userId });
    const updated = await updateTask(task.id, { statusId: status.DONE }, userId);
    expect(updated.completedAt).not.toBeNull();
    const acts = await prisma.activity.findMany({ where: { taskId: task.id }, orderBy: { createdAt: "desc" } });
    expect(acts.map((a) => a.type)).toContain("status_changed");
  });

  it("clears completedAt when moved back to a non-DONE status", async () => {
    const task = await createTask({ listId, name: "Reopen task", createdById: userId });
    await updateTask(task.id, { statusId: status.DONE }, userId);
    const reopened = await updateTask(task.id, { statusId: status.ACTIVE }, userId);
    expect(reopened.completedAt).toBeNull();
  });
});

describe("recurring tasks", () => {
  it("spawns the next occurrence when a recurring task is completed", async () => {
    const task = await createTask({ listId, name: "Recurring task", createdById: userId });
    await updateTask(task.id, { recurrence: "WEEKLY", dueDate: "2026-06-10T12:00:00.000Z" }, userId);
    await updateTask(task.id, { statusId: status.DONE }, userId);

    const all = await prisma.task.findMany({ where: { listId, name: "Recurring task" } });
    expect(all).toHaveLength(2);
    const spawned = all.find((t) => t.statusId === status.NOT_STARTED);
    expect(spawned).toBeTruthy();
    expect(spawned!.recurrence).toBe("WEEKLY");
    // due date advanced by 7 days (Jun 10 -> Jun 17)
    expect(spawned!.dueDate?.toISOString().slice(0, 10)).toBe("2026-06-17");
  });
});

describe("assignee diffing", () => {
  it("logs assignee_added then assignee_removed across updates", async () => {
    const task = await createTask({ listId, name: "Assign task", createdById: userId });
    await updateTask(task.id, { assigneeIds: [userId] }, userId);
    let assignees = await prisma.taskAssignee.findMany({ where: { taskId: task.id } });
    expect(assignees).toHaveLength(1);

    await updateTask(task.id, { assigneeIds: [] }, userId);
    assignees = await prisma.taskAssignee.findMany({ where: { taskId: task.id } });
    expect(assignees).toHaveLength(0);

    const types = (await prisma.activity.findMany({ where: { taskId: task.id } })).map((a) => a.type);
    expect(types).toContain("assignee_added");
    expect(types).toContain("assignee_removed");
  });
});
