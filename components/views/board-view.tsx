"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Popover from "@radix-ui/react-popover";
import { Plus, MessageSquare, GitBranch, ChevronsLeftRight, ChevronsRightLeft, Gauge } from "lucide-react";
import { cn, midpoint } from "@/lib/utils";
import { apiSend } from "@/lib/api";
import type { ListData, TaskWithRelations, StatusModel } from "@/lib/queries";
import { useUpdateTask, useCreateTask } from "@/lib/hooks";
import { useWorkspace } from "@/components/workspace-context";
import { groupTasks, type TaskGroup } from "@/lib/grouping";
import type { GroupBy } from "@/lib/view-state";
import type { Priority } from "@/lib/enums";
import { StatusCircle } from "@/components/menus/status-control";
import { PriorityFlag, DueDate, TagChip } from "@/components/ui/primitives";
import { AvatarStack } from "@/components/ui/avatar";

type Columns = Record<string, TaskWithRelations[]>;

export function BoardView({
  data,
  onOpenTask,
  groupBy = "status",
}: {
  data: ListData;
  onOpenTask: (id: string) => void;
  groupBy?: GroupBy;
}) {
  const { list, tasks } = data;
  const statuses = list.statuses;
  const firstStatusId = statuses[0]?.id;
  const { workspace } = useWorkspace();
  const members = useMemo(() => workspace.members.map((m) => m.user), [workspace.members]);
  const update = useUpdateTask(list.id);

  const groups = useMemo(
    () => groupTasks(tasks, groupBy, { statuses, members }),
    [tasks, groupBy, statuses, members],
  );

  const [columns, setColumns] = useState<Columns>(() => fromGroups(groups));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const statusById = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses]);

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    if (!activeId) setColumns(fromGroups(groups));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const activeTask = useMemo(
    () => (activeId ? Object.values(columns).flat().find((t) => t.id === activeId) ?? null : null),
    [activeId, columns],
  );

  function findColumn(id: string): string | undefined {
    if (columns[id]) return id;
    return Object.keys(columns).find((col) => columns[col].some((t) => t.id === id));
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    const from = findColumn(activeId);
    const to = findColumn(overId);
    if (!from || !to || from === to) return;
    setColumns((prev) => {
      const fromItems = [...prev[from]];
      const toItems = [...prev[to]];
      const idx = fromItems.findIndex((t) => t.id === activeId);
      if (idx < 0) return prev;
      const [moved] = fromItems.splice(idx, 1);
      const overIdx = toItems.findIndex((t) => t.id === overId);
      toItems.splice(overIdx >= 0 ? overIdx : toItems.length, 0, moved);
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    setActiveId(null);
    if (!overId) return;
    const col = findColumn(activeId);
    if (!col) return;

    let items = columns[col];
    const oldIdx = items.findIndex((t) => t.id === activeId);
    const overIdx = items.findIndex((t) => t.id === overId);
    if (oldIdx >= 0 && overIdx >= 0 && oldIdx !== overIdx) {
      items = arrayMove(items, oldIdx, overIdx);
      setColumns((prev) => ({ ...prev, [col]: items }));
    }

    const finalIdx = items.findIndex((t) => t.id === activeId);
    const position = midpoint(items[finalIdx - 1]?.position ?? null, items[finalIdx + 1]?.position ?? null);
    const task = items[finalIdx];

    // apply the grouped field of the destination column
    const patch: { position: number; statusId?: string; priority?: Priority | null; assigneeIds?: string[] } = { position };
    if (groupBy === "status") {
      if (task && task.statusId !== col) patch.statusId = col;
    } else if (groupBy === "priority") {
      patch.priority = col === "none" ? null : (col as Priority);
    } else if (groupBy === "assignee") {
      patch.assigneeIds = col === "unassigned" ? [] : [col];
    }
    update.mutate({ taskId: activeId, patch });
  }

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex h-full items-start gap-3">
          {groups.map((group) =>
            collapsed.has(group.id) ? (
              <CollapsedColumn
                key={group.id}
                group={group}
                count={(columns[group.id] ?? []).length}
                onExpand={() => toggleCollapse(group.id)}
              />
            ) : (
              <Column
                key={group.id}
                group={group}
                tasks={columns[group.id] ?? []}
                listId={list.id}
                firstStatusId={firstStatusId}
                status={groupBy === "status" ? statusById.get(group.id) : undefined}
                onOpenTask={onOpenTask}
                onCollapse={() => toggleCollapse(group.id)}
              />
            ),
          )}
        </div>
        <DragOverlay>{activeTask ? <Card task={activeTask} overlay /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}

function fromGroups(groups: TaskGroup[]): Columns {
  // dedupe: a task (e.g. with multiple assignees) lands in its first group only,
  // so dnd-kit sortable ids stay unique across columns.
  const cols: Columns = {};
  const seen = new Set<string>();
  for (const g of groups) {
    cols[g.id] = [];
    for (const t of [...g.tasks].sort((a, b) => a.position - b.position)) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      cols[g.id].push(t);
    }
  }
  return cols;
}

function Column({
  group,
  tasks,
  listId,
  firstStatusId,
  status,
  onOpenTask,
  onCollapse,
}: {
  group: TaskGroup;
  tasks: TaskWithRelations[];
  listId: string;
  firstStatusId: string | undefined;
  status: StatusModel | undefined;
  onOpenTask: (id: string) => void;
  onCollapse: () => void;
}) {
  const create = useCreateTask(listId);
  const { setNodeRef } = useSortable({ id: group.id, data: { type: "column" } });
  const wip = status?.wipLimit ?? null;
  const overLimit = wip != null && tasks.length > wip;

  return (
    <div className="flex h-full w-[280px] shrink-0 flex-col">
      <div className="group/col mb-2 flex items-center gap-2 px-1">
        <button onClick={onCollapse} className="rounded p-0.5 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-text" title="Collapse">
          <ChevronsRightLeft className="h-3.5 w-3.5" />
        </button>
        <span
          className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
          style={{ color: group.color, backgroundColor: `${group.color}1f` }}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.color }} />
          {group.label}
        </span>
        <span className={cn("text-xs font-medium", overLimit ? "text-cu-urgent" : "text-cu-text-tertiary")}>
          {tasks.length}
          {wip != null && <span className="text-cu-text-tertiary">/{wip}</span>}
        </span>
        {status && <WipEditor status={status} listId={listId} />}
        <button
          onClick={() =>
            create.mutate({
              listId,
              name: "New task",
              statusId: group.statusId ?? firstStatusId,
              priority: group.defaults?.priority,
              assigneeIds: group.defaults?.assigneeIds,
            })
          }
          className="ml-auto rounded p-0.5 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-text"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex min-h-[60px] flex-1 flex-col gap-2 overflow-y-auto rounded-lg bg-cu-sidebar/60 p-2",
            overLimit && "ring-1 ring-inset ring-cu-urgent/60",
          )}
        >
          {tasks.map((task) => (
            <SortableCard key={task.id} task={task} onOpenTask={onOpenTask} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function CollapsedColumn({
  group,
  count,
  onExpand,
}: {
  group: TaskGroup;
  count: number;
  onExpand: () => void;
}) {
  return (
    <button
      onClick={onExpand}
      className="flex h-full w-10 shrink-0 flex-col items-center gap-2 rounded-lg bg-cu-sidebar/60 py-2 hover:bg-cu-sidebar"
      title={`Expand ${group.label}`}
    >
      <ChevronsLeftRight className="h-3.5 w-3.5 text-cu-text-tertiary" />
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.color }} />
      <span className="text-xs font-medium text-cu-text-tertiary">{count}</span>
      <span
        className="mt-1 text-[11px] font-bold uppercase tracking-wide"
        style={{ color: group.color, writingMode: "vertical-rl" }}
      >
        {group.label}
      </span>
    </button>
  );
}

function WipEditor({ status, listId }: { status: StatusModel; listId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(status.wipLimit?.toString() ?? "");
  const save = useMutation({
    mutationFn: (wipLimit: number | null) =>
      apiSend(`/api/statuses/${status.id}`, "PATCH", { wipLimit }),
    onSuccess: () => {
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["list", listId] });
    },
  });
  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (o) setVal(status.wipLimit?.toString() ?? ""); }}>
      <Popover.Trigger asChild>
        <button
          className="rounded p-0.5 text-cu-text-tertiary opacity-0 transition-opacity hover:bg-cu-hover hover:text-cu-text group-hover/col:opacity-100"
          title="WIP limit"
        >
          <Gauge className="h-3.5 w-3.5" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-50 w-[200px] rounded-lg border border-cu-border bg-cu-panel p-2.5 shadow-lg"
        >
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
            WIP limit
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              autoFocus
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save.mutate(val ? parseInt(val, 10) : null);
              }}
              placeholder="None"
              className="w-full rounded border border-cu-border bg-cu-bg px-2 py-1 text-[13px] outline-none focus:border-cu-purple"
            />
            <button
              onClick={() => save.mutate(val ? parseInt(val, 10) : null)}
              className="rounded bg-cu-purple px-2 py-1 text-[12px] font-medium text-white hover:bg-cu-purple-dark"
            >
              Set
            </button>
          </div>
          {status.wipLimit != null && (
            <button
              onClick={() => save.mutate(null)}
              className="mt-1.5 text-[12px] text-cu-text-tertiary hover:text-cu-urgent"
            >
              Clear limit
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SortableCard({ task, onOpenTask }: { task: TaskWithRelations; onOpenTask: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "card" },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
      onClick={() => onOpenTask(task.id)}
    >
      <Card task={task} />
    </div>
  );
}

function Card({ task, overlay }: { task: TaskWithRelations; overlay?: boolean }) {
  return (
    <div
      className={cn(
        "cursor-pointer rounded-lg border border-cu-border bg-cu-panel p-2.5 shadow-sm hover:border-cu-border-strong",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      <div className="flex items-start gap-1.5">
        <span className="mt-0.5">
          <StatusCircle status={task.status} size={14} />
        </span>
        <span className="flex-1 text-[13px] leading-snug text-cu-text">{task.name}</span>
        <PriorityFlag priority={task.priority} />
      </div>

      {task.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 pl-5">
          {task.tags.map((t) => (
            <TagChip key={t.tagId} name={t.tag.name} color={t.tag.color} />
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center gap-2 pl-5 text-cu-text-tertiary">
        {task.dueDate && <DueDate date={task.dueDate} done={task.status.type === "DONE"} />}
        <div className="ml-auto flex items-center gap-2">
          {task._count.subtasks > 0 && (
            <span className="flex items-center gap-0.5 text-[11px]">
              <GitBranch className="h-3 w-3" />
              {task._count.subtasks}
            </span>
          )}
          {task._count.comments > 0 && (
            <span className="flex items-center gap-0.5 text-[11px]">
              <MessageSquare className="h-3 w-3" />
              {task._count.comments}
            </span>
          )}
          {task.assignees.length > 0 && <AvatarStack users={task.assignees.map((a) => a.user)} size="sm" />}
        </div>
      </div>
    </div>
  );
}
