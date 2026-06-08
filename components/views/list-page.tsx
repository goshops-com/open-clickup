"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  List as ListIcon,
  Kanban,
  Calendar as CalendarIcon,
  ChartNoAxesGantt,
  Table2,
  Plus,
  Search,
  Users,
  Ellipsis,
  Star,
  ClipboardList,
  SearchX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { useList, useCreateTask } from "@/lib/hooks";
import { apiSend } from "@/lib/api";
import { ViewType } from "@/lib/enums";
import { EMPTY_VIEW_STATE, applyViewState, type ViewState } from "@/lib/view-state";
import { FilterMenu, SortMenu, GroupMenu } from "@/components/views/filter-sort";
import { ListView } from "@/components/views/list-view";
import { BoardView } from "@/components/views/board-view";
import { CalendarView } from "@/components/views/calendar-view";
import { GanttView } from "@/components/views/gantt-view";
import { TableView } from "@/components/views/table-view";
import { TaskModal } from "@/components/task/task-modal";
import { StatusManager } from "@/components/status/status-manager";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

const VIEW_ICON: Record<ViewType, React.ReactNode> = {
  LIST: <ListIcon className="h-4 w-4" />,
  BOARD: <Kanban className="h-4 w-4" />,
  CALENDAR: <CalendarIcon className="h-4 w-4" />,
  GANTT: <ChartNoAxesGantt className="h-4 w-4" />,
  TABLE: <Table2 className="h-4 w-4" />,
};

function vsFromConfig(config: unknown): ViewState {
  if (config && typeof config === "object") {
    const c = config as Partial<ViewState>;
    return {
      filters: {
        priorities: c.filters?.priorities ?? [],
        assignees: c.filters?.assignees ?? [],
        tags: c.filters?.tags ?? [],
      },
      sort: { field: c.sort?.field ?? null, dir: c.sort?.dir ?? "asc" },
      groupBy: c.groupBy ?? "status",
    };
  }
  return EMPTY_VIEW_STATE;
}

export function ListPage({ listId }: { listId: string }) {
  const { data, isLoading, error } = useList(listId);
  const create = useCreateTask(listId);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const taskParam = searchParams.get("task");
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [statusMgr, setStatusMgr] = useState(false);
  const [vs, setVs] = useState<ViewState>(EMPTY_VIEW_STATE);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const views = data?.list.views ?? [];
  const activeView = views.find((v) => v.id === activeViewId) ?? views[0];

  // initialize the active view + load its persisted config once data arrives
  useEffect(() => {
    if (!activeViewId && views.length) {
      setActiveViewId(views[0].id);
      setVs(vsFromConfig(views[0].config));
    }
  }, [views, activeViewId]);

  function selectView(view: { id: string; config: unknown }) {
    setActiveViewId(view.id);
    setVs(vsFromConfig(view.config)); // load — does NOT trigger a save
  }

  function updateVs(next: ViewState) {
    setVs(next);
    if (!activeViewId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      apiSend(`/api/views/${activeViewId}`, "PATCH", { config: next }).catch(() => {});
    }, 500);
  }

  // open the task modal when navigated with ?task=ID (e.g. from command palette)
  useEffect(() => {
    if (taskParam) setOpenTaskId(taskParam);
  }, [taskParam]);

  function closeTask() {
    setOpenTaskId(null);
    if (taskParam) router.replace(pathname);
  }

  const shownData = useMemo(
    () => (data ? { ...data, tasks: applyViewState(data.tasks, vs) } : data),
    [data, vs],
  );

  async function addTask() {
    if (!data) return;
    const task = await create.mutateAsync({
      listId,
      name: "New task",
      statusId: data.list.statuses[0]?.id,
    });
    setOpenTaskId(task.id);
  }

  // global "c" keyboard shortcut → create a task in this list
  useEffect(() => {
    const handler = () => void addTask();
    window.addEventListener("create-task", handler);
    return () => window.removeEventListener("create-task", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, listId]);

  if (isLoading) return <PageSkeleton />;
  if (error || !data)
    return (
      <div className="flex h-full items-center justify-center text-sm text-cu-text-secondary">
        Couldn&apos;t load this list.
      </div>
    );

  const { list } = data;

  return (
    <div className="flex h-full flex-col">
      {/* breadcrumb / title bar */}
      <div className="flex items-center gap-2 px-4 pt-3">
        <span className="flex items-center gap-1.5 text-[13px] text-cu-text-secondary">
          <span
            className="flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold text-white"
            style={{ backgroundColor: list.space.color }}
          >
            {list.space.icon ?? list.space.name[0]}
          </span>
          {list.space.name}
          {list.folder && <span className="text-cu-text-tertiary">/ {list.folder.name}</span>}
        </span>
      </div>
      <div className="flex items-center gap-2 px-4 pt-1">
        <h1 className="text-lg font-semibold text-cu-text">{list.name}</h1>
        <button className="text-cu-text-tertiary hover:text-[#ffcc00]">
          <Star className="h-4 w-4" />
        </button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover">
              <Ellipsis className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              sideOffset={4}
              align="start"
              className="z-50 min-w-[180px] rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg"
            >
              <DropdownMenu.Item
                onSelect={() => setStatusMgr(true)}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] outline-none hover:bg-cu-hover"
              >
                Edit statuses
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* view tabs */}
      <div className="flex items-center justify-between border-b border-cu-border px-3">
        <div className="flex items-center gap-0.5">
          {list.views.map((v) => (
            <button
              key={v.id}
              onClick={() => selectView(v)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] transition-colors",
                activeView?.id === v.id
                  ? "border-cu-purple font-medium text-cu-text"
                  : "border-transparent text-cu-text-secondary hover:text-cu-text",
              )}
            >
              {VIEW_ICON[v.type]}
              {v.name}
            </button>
          ))}
          <button className="flex items-center gap-1 px-2 py-2 text-[13px] text-cu-text-tertiary hover:text-cu-text">
            <Plus className="h-4 w-4" /> View
          </button>
        </div>

        <div className="flex items-center gap-1 text-cu-text-secondary">
          <ToolbarButton icon={<Users className="h-4 w-4" />} label="Assignee" />
          <GroupMenu state={vs} onChange={updateVs} />
          <FilterMenu state={vs} onChange={updateVs} tasks={data.tasks} />
          <SortMenu state={vs} onChange={updateVs} />
          <button className="rounded p-1.5 hover:bg-cu-hover">
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={addTask}
            className="ml-1 flex items-center gap-1 rounded bg-cu-purple px-2.5 py-1.5 text-[13px] font-medium text-white hover:bg-cu-purple-dark"
          >
            <Plus className="h-4 w-4" /> Add Task
          </button>
        </div>
      </div>

      {/* active view */}
      {shownData && shownData.tasks.length === 0 ? (
        data.tasks.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-6 w-6" />}
            title="This list is empty"
            subtitle="Create your first task to get started."
            action={
              <button
                onClick={addTask}
                className="flex items-center gap-1 rounded-md bg-cu-purple px-3 py-1.5 text-[13px] font-medium text-white hover:bg-cu-purple-dark"
              >
                <Plus className="h-4 w-4" /> Add Task
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={<SearchX className="h-6 w-6" />}
            title="No tasks match your filters"
            subtitle="Try clearing or adjusting the active filters."
          />
        )
      ) : (
        <>
          {activeView?.type === "LIST" && <ListView data={shownData!} onOpenTask={setOpenTaskId} groupBy={vs.groupBy} />}
          {activeView?.type === "BOARD" && <BoardView data={shownData!} onOpenTask={setOpenTaskId} groupBy={vs.groupBy} />}
          {activeView?.type === "CALENDAR" && <CalendarView data={shownData!} onOpenTask={setOpenTaskId} />}
          {activeView?.type === "GANTT" && <GanttView data={shownData!} onOpenTask={setOpenTaskId} />}
          {activeView?.type === "TABLE" && <TableView data={shownData!} onOpenTask={setOpenTaskId} groupBy={vs.groupBy} />}
        </>
      )}

      {openTaskId && (
        <TaskModal taskId={openTaskId} listId={listId} onClose={closeTask} />
      )}
      {statusMgr && (
        <StatusManager listId={listId} statuses={data.list.statuses} onClose={() => setStatusMgr(false)} />
      )}
    </div>
  );
}

function ToolbarButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[13px] hover:bg-cu-hover">
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-3 p-6">
      <div className="h-7 w-56 animate-pulse rounded bg-cu-hover" />
      <div className="h-9 w-full animate-pulse rounded bg-cu-hover" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-9 w-full animate-pulse rounded bg-cu-hover/60" />
      ))}
    </div>
  );
}
