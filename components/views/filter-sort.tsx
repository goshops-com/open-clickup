"use client";

import * as Popover from "@radix-ui/react-popover";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { SlidersHorizontal, ArrowUpDown, Check, ArrowUp, ArrowDown, X, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ViewState, SortField, GroupBy } from "@/lib/view-state";
import { countActiveFilters } from "@/lib/view-state";
import { PRIORITY_ORDER, PRIORITY_CONFIG } from "@/lib/constants";
import { PriorityFlag } from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/avatar";
import { useWorkspace } from "@/components/workspace-context";
import type { TaskWithRelations } from "@/lib/queries";

const SORT_LABELS: Record<Exclude<SortField, null>, string> = {
  priority: "Priority",
  dueDate: "Due date",
  name: "Name",
  created: "Date created",
};

export function FilterMenu({
  state,
  onChange,
  tasks,
}: {
  state: ViewState;
  onChange: (s: ViewState) => void;
  tasks: TaskWithRelations[];
}) {
  const { workspace } = useWorkspace();
  const members = workspace.members.map((m) => m.user);
  const count = countActiveFilters(state);

  // available tags = union across loaded tasks
  const tagMap = new Map<string, { id: string; name: string; color: string }>();
  for (const t of tasks)
    for (const tg of t.tags) tagMap.set(tg.tagId, { id: tg.tagId, name: tg.tag.name, color: tg.tag.color });
  const tags = [...tagMap.values()];

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded px-2 py-1.5 text-[13px] hover:bg-cu-hover",
            count > 0 ? "text-cu-purple" : "text-cu-text-secondary",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Filter</span>
          {count > 0 && (
            <span className="rounded-full bg-cu-purple px-1.5 text-[10px] font-semibold text-white">{count}</span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="end"
          className="z-50 max-h-[420px] w-[260px] overflow-y-auto rounded-lg border border-cu-border bg-cu-panel p-2 shadow-lg"
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">Priority</span>
            {count > 0 && (
              <button
                onClick={() => onChange({ ...state, filters: { priorities: [], assignees: [], tags: [] } })}
                className="flex items-center gap-0.5 text-[11px] text-cu-text-tertiary hover:text-cu-urgent"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
          {PRIORITY_ORDER.map((p) => (
            <Row
              key={p}
              active={state.filters.priorities.includes(p)}
              onClick={() => onChange({ ...state, filters: { ...state.filters, priorities: toggle(state.filters.priorities, p) } })}
            >
              <PriorityFlag priority={p} />
              {PRIORITY_CONFIG[p].label}
            </Row>
          ))}

          <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">Assignee</div>
          {members.map((u) => (
            <Row
              key={u.id}
              active={state.filters.assignees.includes(u.id)}
              onClick={() => onChange({ ...state, filters: { ...state.filters, assignees: toggle(state.filters.assignees, u.id) } })}
            >
              <Avatar user={u} size="sm" />
              {u.name}
            </Row>
          ))}

          {tags.length > 0 && (
            <>
              <div className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">Tags</div>
              {tags.map((t) => (
                <Row
                  key={t.id}
                  active={state.filters.tags.includes(t.id)}
                  onClick={() => onChange({ ...state, filters: { ...state.filters, tags: toggle(state.filters.tags, t.id) } })}
                >
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </Row>
              ))}
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Row({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] hover:bg-cu-hover"
    >
      {children}
      {active && <Check className="ml-auto h-3.5 w-3.5 text-cu-purple" />}
    </button>
  );
}

const GROUP_LABELS: Record<GroupBy, string> = {
  status: "Status",
  assignee: "Assignee",
  priority: "Priority",
  none: "None",
};

export function GroupMenu({
  state,
  onChange,
}: {
  state: ViewState;
  onChange: (s: ViewState) => void;
}) {
  const active = state.groupBy !== "status";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded px-2 py-1.5 text-[13px] hover:bg-cu-hover",
            active ? "text-cu-purple" : "text-cu-text-secondary",
          )}
        >
          <Layers className="h-4 w-4" />
          <span className="hidden sm:inline">Group: {GROUP_LABELS[state.groupBy]}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="end"
          className="z-50 min-w-[180px] rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg"
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">Group by</div>
          {(Object.keys(GROUP_LABELS) as GroupBy[]).map((g) => (
            <DropdownMenu.Item
              key={g}
              onSelect={(e) => { e.preventDefault(); onChange({ ...state, groupBy: g }); }}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] outline-none hover:bg-cu-hover"
            >
              {GROUP_LABELS[g]}
              {state.groupBy === g && <Check className="ml-auto h-3.5 w-3.5 text-cu-purple" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function SortMenu({
  state,
  onChange,
}: {
  state: ViewState;
  onChange: (s: ViewState) => void;
}) {
  const active = state.sort.field;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded px-2 py-1.5 text-[13px] hover:bg-cu-hover",
            active ? "text-cu-purple" : "text-cu-text-secondary",
          )}
        >
          <ArrowUpDown className="h-4 w-4" />
          <span className="hidden sm:inline">{active ? SORT_LABELS[active] : "Sort"}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="end"
          className="z-50 min-w-[200px] rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg"
        >
          {(Object.keys(SORT_LABELS) as Exclude<SortField, null>[]).map((f) => (
            <DropdownMenu.Item
              key={f}
              onSelect={(e) => {
                e.preventDefault();
                onChange({ ...state, sort: { field: f, dir: state.sort.dir } });
              }}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] outline-none hover:bg-cu-hover"
            >
              {SORT_LABELS[f]}
              {active === f && <Check className="ml-auto h-3.5 w-3.5 text-cu-purple" />}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-cu-border" />
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onChange({ ...state, sort: { ...state.sort, dir: state.sort.dir === "asc" ? "desc" : "asc" } });
            }}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] outline-none hover:bg-cu-hover"
          >
            {state.sort.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
            {state.sort.dir === "asc" ? "Ascending" : "Descending"}
          </DropdownMenu.Item>
          {active && (
            <DropdownMenu.Item
              onSelect={(e) => {
                e.preventDefault();
                onChange({ ...state, sort: { field: null, dir: "asc" } });
              }}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] text-cu-text-secondary outline-none hover:bg-cu-hover"
            >
              <X className="h-3.5 w-3.5" /> Clear sort
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
