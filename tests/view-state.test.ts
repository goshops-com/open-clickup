import { describe, it, expect } from "vitest";
import { applyViewState, EMPTY_VIEW_STATE, type ViewState } from "@/lib/view-state";
import type { TaskWithRelations } from "@/lib/queries";

function mkTask(p: Partial<TaskWithRelations> & { id: string }): TaskWithRelations {
  return {
    id: p.id,
    name: p.name ?? p.id,
    statusId: p.statusId ?? "s1",
    priority: p.priority ?? null,
    position: p.position ?? 0,
    dueDate: p.dueDate ?? null,
    createdAt: p.createdAt ?? new Date("2026-01-01"),
    assignees: p.assignees ?? [],
    tags: p.tags ?? [],
  } as unknown as TaskWithRelations;
}

const tasks = [
  mkTask({ id: "a", name: "Banana", priority: "LOW", assignees: [{ userId: "u1" }] as never }),
  mkTask({ id: "b", name: "Apple", priority: "URGENT", assignees: [{ userId: "u2" }] as never, tags: [{ tagId: "t1" }] as never }),
  mkTask({ id: "c", name: "Cherry", priority: "URGENT", assignees: [{ userId: "u1" }] as never }),
];

function vs(over: Partial<ViewState>): ViewState {
  return { ...EMPTY_VIEW_STATE, ...over, filters: { ...EMPTY_VIEW_STATE.filters, ...over.filters } };
}

describe("applyViewState — filtering", () => {
  it("filters by priority", () => {
    const out = applyViewState(tasks, vs({ filters: { priorities: ["URGENT"], assignees: [], tags: [] } }));
    expect(out.map((t) => t.id).sort()).toEqual(["b", "c"]);
  });
  it("filters by assignee", () => {
    const out = applyViewState(tasks, vs({ filters: { priorities: [], assignees: ["u2"], tags: [] } }));
    expect(out.map((t) => t.id)).toEqual(["b"]);
  });
  it("filters by tag", () => {
    const out = applyViewState(tasks, vs({ filters: { priorities: [], assignees: [], tags: ["t1"] } }));
    expect(out.map((t) => t.id)).toEqual(["b"]);
  });
  it("returns all with no filters", () => {
    expect(applyViewState(tasks, EMPTY_VIEW_STATE)).toHaveLength(3);
  });
});

describe("applyViewState — sorting", () => {
  it("sorts by name ascending", () => {
    const out = applyViewState(tasks, vs({ sort: { field: "name", dir: "asc" } }));
    expect(out.map((t) => t.name)).toEqual(["Apple", "Banana", "Cherry"]);
  });
  it("sorts by name descending", () => {
    const out = applyViewState(tasks, vs({ sort: { field: "name", dir: "desc" } }));
    expect(out.map((t) => t.name)).toEqual(["Cherry", "Banana", "Apple"]);
  });
  it("sorts by priority (urgent first)", () => {
    const out = applyViewState(tasks, vs({ sort: { field: "priority", dir: "asc" } }));
    expect(out[0].priority).toBe("URGENT");
    expect(out[out.length - 1].priority).toBe("LOW");
  });
});
