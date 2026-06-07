"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from "date-fns";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListData, TaskWithRelations } from "@/lib/queries";
import { StatusCircle } from "@/components/menus/status-control";
import { useUpdateTask } from "@/lib/hooks";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type Mode = "month" | "week";

export function CalendarView({
  data,
  onOpenTask,
}: {
  data: ListData;
  onOpenTask: (id: string) => void;
}) {
  const [cursor, setCursor] = useState(() => new Date());
  const [mode, setMode] = useState<Mode>("month");
  const update = useUpdateTask(data.list.id);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const days = useMemo(() => {
    if (mode === "week") {
      return eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) });
    }
    return eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) });
  }, [cursor, mode]);

  const dayByKey = useMemo(() => {
    const m = new Map<string, Date>();
    for (const d of days) m.set(format(d, "yyyy-MM-dd"), d);
    return m;
  }, [days]);

  const byDay = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    for (const t of data.tasks) {
      if (!t.dueDate) continue;
      const key = format(new Date(t.dueDate), "yyyy-MM-dd");
      (map.get(key) ?? map.set(key, []).get(key)!).push(t);
    }
    return map;
  }, [data.tasks]);

  function step(dir: -1 | 1) {
    setCursor((c) => (mode === "week" ? (dir === 1 ? addWeeks(c, 1) : subWeeks(c, 1)) : dir === 1 ? addMonths(c, 1) : subMonths(c, 1)));
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const day = dayByKey.get(String(e.over.id));
    if (!day) return;
    const due = new Date(day);
    due.setHours(12, 0, 0, 0); // noon avoids TZ day-shift
    update.mutate({ taskId: String(e.active.id), patch: { dueDate: due.toISOString() } });
  }

  const title =
    mode === "week"
      ? `${format(startOfWeek(cursor), "MMM d")} – ${format(endOfWeek(cursor), "MMM d, yyyy")}`
      : format(cursor, "MMMM yyyy");
  const perDayCap = mode === "week" ? 12 : 4;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* toolbar */}
      <div className="flex items-center gap-3 px-4 py-2">
        <h2 className="text-sm font-semibold text-cu-text">{title}</h2>
        <div className="flex items-center">
          <button onClick={() => step(-1)} className="rounded p-1 hover:bg-cu-hover">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => step(1)} className="rounded p-1 hover:bg-cu-hover">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => setCursor(new Date())}
          className="rounded border border-cu-border px-2.5 py-1 text-[13px] hover:bg-cu-hover"
        >
          Today
        </button>
        <div className="ml-auto flex rounded-md border border-cu-border p-0.5">
          {(["month", "week"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded px-2.5 py-1 text-[12px] font-medium capitalize",
                mode === m ? "bg-cu-purple text-white" : "text-cu-text-secondary hover:bg-cu-hover",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* weekday header */}
      <div className="grid grid-cols-7 border-y border-cu-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
            {d}
          </div>
        ))}
      </div>

      {/* day grid */}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className={cn("grid flex-1 grid-cols-7 overflow-auto", mode === "week" ? "auto-rows-fr" : "auto-rows-fr")}>
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const tasks = byDay.get(key) ?? [];
            const inMonth = mode === "week" || isSameMonth(day, cursor);
            return (
              <DayCell key={key} dayKey={key} dimmed={!inMonth} minH={mode === "week" ? 240 : 110}>
                <div className="mb-1 flex justify-end">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                      isToday(day) ? "bg-cu-purple font-semibold text-white" : inMonth ? "text-cu-text-secondary" : "text-cu-text-tertiary",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-1">
                  {tasks.slice(0, perDayCap).map((t) => (
                    <DraggableTask key={t.id} task={t} onOpen={() => onOpenTask(t.id)} />
                  ))}
                  {tasks.length > perDayCap && (
                    <div className="px-1 text-[11px] text-cu-text-tertiary">+{tasks.length - perDayCap} more</div>
                  )}
                </div>
              </DayCell>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}

function DayCell({
  dayKey,
  dimmed,
  minH,
  children,
}: {
  dayKey: string;
  dimmed: boolean;
  minH: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-b border-r border-cu-border/60 p-1.5 transition-colors",
        dimmed && "bg-cu-sidebar/40",
        isOver && "bg-cu-purple-light/60 ring-1 ring-inset ring-cu-purple",
      )}
      style={{ minHeight: minH }}
    >
      {children}
    </div>
  );
}

function DraggableTask({ task, onOpen }: { task: TaskWithRelations; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  return (
    <button
      ref={setNodeRef}
      onClick={onOpen}
      {...listeners}
      {...attributes}
      className={cn(
        "flex w-full cursor-grab items-center gap-1 rounded px-1.5 py-1 text-left text-[11px] hover:brightness-95 active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
      style={{
        backgroundColor: `${task.status.color}1f`,
        color: task.status.color,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        zIndex: isDragging ? 50 : undefined,
        position: isDragging ? "relative" : undefined,
      }}
    >
      <StatusCircle status={task.status} size={10} />
      <span className="truncate text-cu-text">{task.name}</span>
    </button>
  );
}
