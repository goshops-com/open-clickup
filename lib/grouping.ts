import type { TaskWithRelations, StatusModel, UserLite } from "@/lib/queries";
import type { GroupBy } from "@/lib/view-state";
import { PRIORITY_CONFIG, PRIORITY_ORDER } from "@/lib/constants";

export type TaskGroup = {
  id: string;
  label: string;
  color: string;
  /** present when grouping by status — used so "add task" lands in the group */
  statusId?: string;
  /** attributes a new task in this group should inherit */
  defaults?: { priority?: string; assigneeIds?: string[] };
  tasks: TaskWithRelations[];
};

export function groupTasks(
  tasks: TaskWithRelations[],
  groupBy: GroupBy,
  ctx: { statuses: StatusModel[]; members: UserLite[] },
): TaskGroup[] {
  switch (groupBy) {
    case "none":
      return [{ id: "all", label: "All tasks", color: "#87909e", tasks }];

    case "priority": {
      const groups: TaskGroup[] = PRIORITY_ORDER.map((p) => ({
        id: p,
        label: PRIORITY_CONFIG[p].label,
        color: PRIORITY_CONFIG[p].color,
        defaults: { priority: p },
        tasks: tasks.filter((t) => t.priority === p),
      }));
      const none = tasks.filter((t) => !t.priority);
      if (none.length) groups.push({ id: "none", label: "No priority", color: "#b5bcc9", tasks: none });
      return groups;
    }

    case "assignee": {
      const byUser = new Map<string, TaskWithRelations[]>();
      const unassigned: TaskWithRelations[] = [];
      for (const t of tasks) {
        if (!t.assignees.length) unassigned.push(t);
        for (const a of t.assignees) {
          (byUser.get(a.userId) ?? byUser.set(a.userId, []).get(a.userId)!).push(t);
        }
      }
      const groups: TaskGroup[] = ctx.members
        .filter((m) => byUser.has(m.id))
        .map((m) => ({
          id: m.id,
          label: m.name,
          color: m.color,
          defaults: { assigneeIds: [m.id] },
          tasks: byUser.get(m.id)!,
        }));
      if (unassigned.length)
        groups.push({ id: "unassigned", label: "Unassigned", color: "#b5bcc9", tasks: unassigned });
      return groups;
    }

    case "status":
    default:
      return ctx.statuses.map((s) => ({
        id: s.id,
        label: s.name,
        color: s.color,
        statusId: s.id,
        tasks: tasks.filter((t) => t.statusId === s.id),
      }));
  }
}
