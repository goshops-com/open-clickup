import { describe, it, expect } from "vitest";
import { groupTasks } from "@/lib/grouping";
import type { TaskWithRelations, StatusModel, UserLite } from "@/lib/queries";

const statuses = [
  { id: "todo", name: "TO DO", color: "#888", type: "NOT_STARTED" },
  { id: "done", name: "DONE", color: "#0a0", type: "DONE" },
] as unknown as StatusModel[];

const members = [
  { id: "u1", name: "Ann" },
  { id: "u2", name: "Bob" },
] as unknown as UserLite[];

function mkTask(p: { id: string; statusId: string; priority?: string | null; assignees?: string[] }): TaskWithRelations {
  return {
    id: p.id,
    statusId: p.statusId,
    priority: p.priority ?? null,
    assignees: (p.assignees ?? []).map((userId) => ({ userId })),
    tags: [],
    position: 0,
  } as unknown as TaskWithRelations;
}

const tasks = [
  mkTask({ id: "a", statusId: "todo", priority: "URGENT", assignees: ["u1"] }),
  mkTask({ id: "b", statusId: "done", priority: null, assignees: ["u1", "u2"] }),
  mkTask({ id: "c", statusId: "todo", priority: "LOW", assignees: [] }),
];

describe("groupTasks", () => {
  it("groups by status (one group per status)", () => {
    const g = groupTasks(tasks, "status", { statuses, members });
    expect(g.map((x) => x.id)).toEqual(["todo", "done"]);
    expect(g[0].tasks.map((t) => t.id).sort()).toEqual(["a", "c"]);
    expect(g[1].tasks.map((t) => t.id)).toEqual(["b"]);
  });

  it("groups by priority with a 'no priority' bucket", () => {
    const g = groupTasks(tasks, "priority", { statuses, members });
    const urgent = g.find((x) => x.id === "URGENT");
    const none = g.find((x) => x.id === "none");
    expect(urgent?.tasks.map((t) => t.id)).toEqual(["a"]);
    expect(none?.tasks.map((t) => t.id)).toEqual(["b"]);
  });

  it("groups by assignee (+ unassigned); multi-assignee shows in each", () => {
    const g = groupTasks(tasks, "assignee", { statuses, members });
    const ann = g.find((x) => x.id === "u1");
    const bob = g.find((x) => x.id === "u2");
    const unassigned = g.find((x) => x.id === "unassigned");
    expect(ann?.tasks.map((t) => t.id).sort()).toEqual(["a", "b"]);
    expect(bob?.tasks.map((t) => t.id)).toEqual(["b"]);
    expect(unassigned?.tasks.map((t) => t.id)).toEqual(["c"]);
  });

  it("none → a single group with all tasks", () => {
    const g = groupTasks(tasks, "none", { statuses, members });
    expect(g).toHaveLength(1);
    expect(g[0].tasks).toHaveLength(3);
  });
});
