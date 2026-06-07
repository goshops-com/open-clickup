"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  MessageSquare,
  GitBranch,
  Ellipsis,
  Trash2,
  Pencil,
  Maximize2,
  GripVertical,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn, midpoint } from "@/lib/utils";
import type { ListData, TaskWithRelations, StatusModel, CustomFieldWithOptions } from "@/lib/queries";
import { useUpdateTask, useCreateTask, useSetFieldValue, useDeleteTask, useBulk } from "@/lib/hooks";
import { useWorkspace } from "@/components/workspace-context";
import { groupTasks, type TaskGroup } from "@/lib/grouping";
import type { GroupBy } from "@/lib/view-state";
import { StatusControl, StatusCircle } from "@/components/menus/status-control";
import { PriorityControl } from "@/components/menus/priority-control";
import { AssigneeControl } from "@/components/menus/assignee-control";
import { DateControl } from "@/components/menus/date-control";
import { TagChip } from "@/components/ui/primitives";
import { CustomFieldControl } from "@/components/views/custom-field-control";
import { AddFieldDialog } from "@/components/views/add-field-dialog";
import { BulkBar } from "@/components/views/bulk-bar";

/** Cap rendered rows per group; "Show more" reveals the next page. Keeps the DOM bounded for large lists. */
const PAGE_SIZE = 50;

export function ListView({
  data,
  onOpenTask,
  groupBy = "status",
}: {
  data: ListData;
  onOpenTask: (taskId: string) => void;
  groupBy?: GroupBy;
}) {
  const { list, tasks } = data;
  const statuses = list.statuses;
  const customFields = list.customFields;
  const { workspace } = useWorkspace();
  const members = useMemo(() => workspace.members.map((m) => m.user), [workspace.members]);
  const update = useUpdateTask(list.id);
  const bulk = useBulk(list.id);
  const [addingField, setAddingField] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const clearSelect = () => setSelected(new Set());

  // drag-to-reorder is enabled only when grouping by status (cross-group = status change)
  const sortable = groupBy === "status";
  const [cols, setCols] = useState<Record<string, TaskWithRelations[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!sortable || activeId) return;
    const next: Record<string, TaskWithRelations[]> = {};
    for (const s of statuses) next[s.id] = [];
    for (const t of tasks) (next[t.statusId] ??= []).push(t);
    for (const k of Object.keys(next)) next[k].sort((a, b) => a.position - b.position);
    setCols(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, statuses, sortable]);

  const groups = useMemo(() => {
    if (sortable) {
      return statuses.map((s) => ({
        id: s.id,
        label: s.name,
        color: s.color,
        statusId: s.id,
        tasks: cols[s.id] ?? [],
      }));
    }
    return groupTasks(tasks, groupBy, { statuses, members });
  }, [sortable, cols, tasks, groupBy, statuses, members]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function findCol(id: string): string | undefined {
    if (cols[id]) return id;
    return Object.keys(cols).find((c) => cols[c].some((t) => t.id === id));
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }
  function onDragOver(e: DragOverEvent) {
    const id = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    const from = findCol(id);
    const to = findCol(overId) ?? (cols[overId] ? overId : undefined);
    if (!from || !to || from === to) return;
    setCols((prev) => {
      const fromItems = [...prev[from]];
      const toItems = [...prev[to]];
      const idx = fromItems.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const [moved] = fromItems.splice(idx, 1);
      const overIdx = toItems.findIndex((t) => t.id === overId);
      toItems.splice(overIdx >= 0 ? overIdx : toItems.length, 0, moved);
      return { ...prev, [from]: fromItems, [to]: toItems };
    });
  }
  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    setActiveId(null);
    if (!overId) return;
    const col = findCol(id);
    if (!col) return;
    let items = cols[col];
    const oldIdx = items.findIndex((t) => t.id === id);
    const overIdx = items.findIndex((t) => t.id === overId);
    if (oldIdx >= 0 && overIdx >= 0 && oldIdx !== overIdx) {
      items = arrayMove(items, oldIdx, overIdx);
      setCols((prev) => ({ ...prev, [col]: items }));
    }
    const finalIdx = items.findIndex((t) => t.id === id);
    const position = midpoint(items[finalIdx - 1]?.position ?? null, items[finalIdx + 1]?.position ?? null);
    const patch: { statusId?: string; position: number } = { position };
    const task = items[finalIdx];
    if (task && task.statusId !== col) patch.statusId = col;
    update.mutate({ taskId: id, patch });
  }

  const gridStyle = {
    gridTemplateColumns: `minmax(260px,1fr) 120px 110px 120px ${customFields.map(() => "150px").join(" ")} 44px`,
  };

  const body = (
    <>
      <ColumnHeader customFields={customFields} gridStyle={gridStyle} onAddField={() => setAddingField(true)} />
      {groups.map((group) => (
        <Group
          key={group.id}
          group={group}
          statuses={statuses}
          customFields={customFields}
          listId={list.id}
          firstStatusId={statuses[0]?.id}
          gridStyle={gridStyle}
          sortable={sortable}
          selected={selected}
          onToggleSelect={toggleSelect}
          onOpenTask={onOpenTask}
          onUpdate={(taskId, patch) => update.mutate({ taskId, patch })}
        />
      ))}
    </>
  );

  return (
    <div className="flex-1 overflow-auto">
      <div className="min-w-max">
        {sortable ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
            {body}
          </DndContext>
        ) : (
          body
        )}
      </div>
      {addingField && <AddFieldDialog listId={list.id} onClose={() => setAddingField(false)} />}
      {selected.size > 0 && (
        <BulkBar
          count={selected.size}
          statuses={statuses}
          onSetStatus={(statusId) => bulk.mutate({ ids: [...selected], patch: { statusId } })}
          onSetPriority={(priority) => bulk.mutate({ ids: [...selected], patch: { priority } })}
          onSetAssignees={(assigneeIds) => bulk.mutate({ ids: [...selected], patch: { assigneeIds } })}
          onDelete={() => { bulk.mutate({ ids: [...selected], delete: true }); clearSelect(); }}
          onClear={clearSelect}
        />
      )}
    </div>
  );
}

function ColumnHeader({
  customFields,
  gridStyle,
  onAddField,
}: {
  customFields: CustomFieldWithOptions[];
  gridStyle: React.CSSProperties;
  onAddField: () => void;
}) {
  return (
    <div
      className="sticky top-0 z-10 grid items-center border-b border-cu-border bg-cu-bg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary"
      style={gridStyle}
    >
      <div className="pl-7">Name</div>
      <div>Assignee</div>
      <div>Due date</div>
      <div>Priority</div>
      {customFields.map((f) => (
        <div key={f.id} className="truncate">{f.name}</div>
      ))}
      <div className="flex justify-center">
        <button
          onClick={onAddField}
          title="Add column"
          className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-text"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Group({
  group,
  statuses,
  customFields,
  listId,
  firstStatusId,
  gridStyle,
  sortable,
  selected,
  onToggleSelect,
  onOpenTask,
  onUpdate,
}: {
  group: TaskGroup;
  statuses: StatusModel[];
  customFields: CustomFieldWithOptions[];
  listId: string;
  firstStatusId: string | undefined;
  gridStyle: React.CSSProperties;
  sortable: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenTask: (id: string) => void;
  onUpdate: (taskId: string, patch: Record<string, unknown>) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const rowProps = { statuses, customFields, gridStyle, selected, onToggleSelect, onOpenTask, onUpdate };
  const shown = group.tasks.slice(0, visible);
  const hidden = group.tasks.length - shown.length;

  return (
    <div className="border-b border-cu-border/70">
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={() => setCollapsed((c) => !c)} className="text-cu-text-tertiary hover:text-cu-text">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <span
          className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
          style={{ color: group.color, backgroundColor: `${group.color}1f` }}
        >
          {group.label}
        </span>
        <span className="text-xs font-medium text-cu-text-tertiary">{group.tasks.length}</span>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-text"
        >
          <Plus className="h-3.5 w-3.5" /> Add Task
        </button>
      </div>

      {!collapsed &&
        (sortable ? (
          <SortableBody group={{ ...group, tasks: shown }} rowProps={rowProps} />
        ) : (
          <div>
            {shown.map((task) => (
              <TaskRow key={task.id} task={task} {...rowProps} />
            ))}
          </div>
        ))}

      {!collapsed && hidden > 0 && (
        <button
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="flex w-full items-center gap-1.5 border-t border-cu-border/60 px-3 py-1.5 pl-[42px] text-[13px] font-medium text-cu-purple hover:bg-cu-hover/40"
        >
          Show {Math.min(hidden, PAGE_SIZE)} more ({hidden} hidden)
        </button>
      )}

      {!collapsed && (
        <AddTaskRow
          listId={listId}
          statusId={group.statusId ?? firstStatusId}
          defaults={group.defaults}
          open={adding}
          setOpen={setAdding}
        />
      )}
    </div>
  );
}

type RowProps = {
  statuses: StatusModel[];
  customFields: CustomFieldWithOptions[];
  gridStyle: React.CSSProperties;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenTask: (id: string) => void;
  onUpdate: (taskId: string, patch: Record<string, unknown>) => void;
};

function SortableBody({ group, rowProps }: { group: TaskGroup; rowProps: RowProps }) {
  const { setNodeRef } = useSortable({ id: group.id, data: { type: "column" } });
  return (
    <SortableContext items={group.tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
      <div ref={setNodeRef} className="min-h-[8px]">
        {group.tasks.map((task) => (
          <SortableRow key={task.id} task={task} rowProps={rowProps} />
        ))}
      </div>
    </SortableContext>
  );
}

function SortableRow({ task, rowProps }: { task: TaskWithRelations; rowProps: RowProps }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "row" },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-40")}
    >
      <TaskRow
        task={task}
        {...rowProps}
        handle={
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="hidden cursor-grab text-cu-text-tertiary hover:text-cu-text active:cursor-grabbing group-hover:block"
            title="Drag to reorder"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        }
      />
    </div>
  );
}

function TaskRow({
  task,
  statuses,
  customFields,
  gridStyle,
  selected,
  onToggleSelect,
  onOpenTask,
  onUpdate,
  handle,
}: {
  task: TaskWithRelations;
  statuses: StatusModel[];
  customFields: CustomFieldWithOptions[];
  gridStyle: React.CSSProperties;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenTask: (id: string) => void;
  onUpdate: (taskId: string, patch: Record<string, unknown>) => void;
  handle?: React.ReactNode;
}) {
  const isSelected = selected.has(task.id);
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setField = useSetFieldValue(task.listId);
  const del = useDeleteTask(task.listId);
  const hasSubtasks = task.subtasks.length > 0;

  // single click on the name opens the task; double click renames it
  function onNameClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (clickTimer.current) return;
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      onOpenTask(task.id);
    }, 220);
  }
  function onNameDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    setRenaming(true);
  }

  return (
    <>
      <div
        className={cn(
          "group grid cursor-pointer items-center border-t border-cu-border/60 px-3",
          isSelected ? "bg-cu-purple-light hover:bg-cu-purple-light" : "hover:bg-cu-hover/60",
        )}
        style={gridStyle}
        onClick={() => !renaming && onOpenTask(task.id)}
      >
        <div className="flex items-center gap-1.5 py-2">
          {handle && <span className="-ml-1 flex w-3 justify-center">{handle}</span>}
          <span className="flex w-4 justify-center" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(task.id)}
              className={cn(
                "h-3.5 w-3.5 cursor-pointer accent-[var(--cu-purple)]",
                !isSelected && "opacity-0 group-hover:opacity-100",
              )}
            />
          </span>
          <span className="flex w-4 justify-center">
            {hasSubtasks ? (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded((x) => !x); }}
                className="text-cu-text-tertiary hover:text-cu-text"
              >
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : null}
          </span>
          <span onClick={(e) => e.stopPropagation()}>
            <StatusControl current={task.status} statuses={statuses} onChange={(s) => onUpdate(task.id, { statusId: s })} />
          </span>
          {renaming ? (
            <input
              autoFocus
              defaultValue={task.name}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") { onUpdate(task.id, { name: (e.target as HTMLInputElement).value.trim() }); setRenaming(false); }
                if (e.key === "Escape") setRenaming(false);
              }}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== task.name) onUpdate(task.id, { name: v }); setRenaming(false); }}
              className="flex-1 rounded border border-cu-purple bg-cu-panel px-1 py-0.5 text-[13px] outline-none"
            />
          ) : (
            <span
              className="truncate text-[13px] text-cu-text"
              onClick={onNameClick}
              onDoubleClick={onNameDoubleClick}
            >
              {task.name}
            </span>
          )}

          <span className="ml-1 flex items-center gap-2 text-cu-text-tertiary">
            {task._count.subtasks > 0 && (
              <span className="flex items-center gap-0.5 text-[11px]"><GitBranch className="h-3 w-3" />{task._count.subtasks}</span>
            )}
            {task._count.comments > 0 && (
              <span className="flex items-center gap-0.5 text-[11px]"><MessageSquare className="h-3 w-3" />{task._count.comments}</span>
            )}
          </span>

          <span className="ml-auto flex items-center gap-1.5 pl-2">
            {task.tags.slice(0, 3).map((t) => (
              <TagChip key={t.tagId} name={t.tag.name} color={t.tag.color} />
            ))}
          </span>
        </div>

        <div className="py-2" onClick={(e) => e.stopPropagation()}>
          <AssigneeControl assignees={task.assignees.map((a) => a.user)} onChange={(ids) => onUpdate(task.id, { assigneeIds: ids })} />
        </div>

        <div className="py-2 text-cu-text-secondary" onClick={(e) => e.stopPropagation()}>
          <DateControl
            value={task.dueDate}
            done={task.status.type === "DONE"}
            onChange={(d) => onUpdate(task.id, { dueDate: d ? d.toISOString() : null })}
            placeholder=""
          />
        </div>

        <div className="py-2" onClick={(e) => e.stopPropagation()}>
          <PriorityControl value={task.priority} onChange={(p) => onUpdate(task.id, { priority: p })} />
        </div>

        {customFields.map((f) => (
          <div key={f.id} className="py-2" onClick={(e) => e.stopPropagation()}>
            <CustomFieldControl
              field={f}
              value={task.customFieldValues.find((cv) => cv.customFieldId === f.id)?.value}
              onChange={(value) => setField.mutate({ taskId: task.id, fieldId: f.id, value })}
              compact
            />
          </div>
        ))}
        <div className="flex justify-center py-2" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="hidden rounded p-1 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-text group-hover:block">
                <Ellipsis className="h-4 w-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content sideOffset={4} align="end" className="z-50 min-w-[150px] rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg">
                <RowMenuItem icon={<Maximize2 className="h-4 w-4" />} label="Open" onSelect={() => onOpenTask(task.id)} />
                <RowMenuItem icon={<Pencil className="h-4 w-4" />} label="Rename" onSelect={() => setRenaming(true)} />
                <RowMenuItem icon={<Trash2 className="h-4 w-4" />} label="Delete" danger onSelect={() => del.mutate(task.id)} />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {expanded &&
        task.subtasks.map((sub) => (
          <div
            key={sub.id}
            className="grid cursor-pointer items-center border-t border-cu-border/40 bg-cu-sidebar/40 px-3 hover:bg-cu-hover/60"
            style={gridStyle}
            onClick={() => onOpenTask(sub.id)}
          >
            <div className="flex items-center gap-1.5 py-2 pl-8">
              <StatusCircle status={sub.status} />
              <span className="truncate text-[13px] text-cu-text">{sub.name}</span>
            </div>
            <div className="py-2">
              {sub.assignees.length > 0 && (
                <AssigneeControl assignees={sub.assignees.map((a) => a.user)} onChange={() => {}} />
              )}
            </div>
            <div />
            <div />
            {customFields.map((f) => <div key={f.id} />)}
            <div />
          </div>
        ))}
    </>
  );
}

function RowMenuItem({
  icon,
  label,
  onSelect,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
  danger?: boolean;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] outline-none hover:bg-cu-hover focus:bg-cu-hover",
        danger && "text-cu-urgent",
      )}
    >
      {icon}
      {label}
    </DropdownMenu.Item>
  );
}

function AddTaskRow({
  listId,
  statusId,
  defaults,
  open,
  setOpen,
}: {
  listId: string;
  statusId: string | undefined;
  defaults?: { priority?: string; assigneeIds?: string[] };
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const create = useCreateTask(listId);
  const [name, setName] = useState("");

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) { setOpen(false); return; }
    create.mutate({ listId, name: trimmed, statusId, priority: defaults?.priority, assigneeIds: defaults?.assigneeIds });
    setName("");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-1.5 border-t border-cu-border/60 px-3 py-1.5 pl-[42px] text-[13px] text-cu-text-tertiary hover:bg-cu-hover/40 hover:text-cu-text-secondary"
      >
        <Plus className="h-3.5 w-3.5" /> Add Task
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 border-t border-cu-border/60 px-3 py-1.5 pl-[42px]">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }}
        onBlur={submit}
        placeholder="Task name"
        className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-cu-text-tertiary"
      />
    </div>
  );
}
