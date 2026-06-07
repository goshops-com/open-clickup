"use client";

import { useMemo } from "react";
import {
  eachDayOfInterval,
  differenceInCalendarDays,
  format,
  isToday,
  isWeekend,
  startOfDay,
  addDays,
} from "date-fns";
import { cn } from "@/lib/utils";
import type { ListData, TaskWithRelations } from "@/lib/queries";
import { StatusCircle } from "@/components/menus/status-control";
import { AvatarStack } from "@/components/ui/avatar";

const DAY_W = 34;
const NAME_W = 260;
const ROW_H = 39; // timeline cell (38) + row border (1)

type Geo = { cy: number; left: number; right: number; visible: boolean };

function barGeometry(task: TaskWithRelations, start: Date, rowIndex: number): Geo {
  const s = task.startDate
    ? startOfDay(new Date(task.startDate))
    : task.dueDate
      ? startOfDay(new Date(task.dueDate))
      : null;
  const e = task.dueDate ? startOfDay(new Date(task.dueDate)) : s;
  const offset = s ? differenceInCalendarDays(s, start) : 0;
  const span = s && e ? differenceInCalendarDays(e, s) + 1 : 0;
  return {
    cy: rowIndex * ROW_H + ROW_H / 2,
    left: offset * DAY_W + 3,
    right: offset * DAY_W + span * DAY_W - 3,
    visible: span > 0,
  };
}

export function GanttView({
  data,
  onOpenTask,
}: {
  data: ListData;
  onOpenTask: (id: string) => void;
}) {
  const tasks = data.tasks;
  const dependencies = data.dependencies;

  const { start, days } = useMemo(() => {
    const dates: Date[] = [];
    for (const t of tasks) {
      if (t.startDate) dates.push(new Date(t.startDate));
      if (t.dueDate) dates.push(new Date(t.dueDate));
    }
    const today = startOfDay(new Date());
    let min = dates.length ? new Date(Math.min(...dates.map((d) => +d))) : today;
    let max = dates.length ? new Date(Math.max(...dates.map((d) => +d))) : addDays(today, 14);
    min = startOfDay(addDays(min < today ? min : today, -3));
    max = startOfDay(addDays(max > today ? max : today, 7));
    return { start: min, days: eachDayOfInterval({ start: min, end: max }) };
  }, [tasks]);

  // bar geometry per task (for drawing dependency arrows)
  const geo = useMemo(() => {
    const map = new Map<string, Geo>();
    tasks.forEach((t, i) => map.set(t.id, barGeometry(t, start, i)));
    return map;
  }, [tasks, start]);

  const arrows = useMemo(() => {
    return dependencies
      .map((d) => {
        const from = geo.get(d.blockerId);
        const to = geo.get(d.blockedId);
        if (!from || !to || !from.visible || !to.visible) return null;
        return { id: d.id, x1: from.right, y1: from.cy, x2: to.left, y2: to.cy };
      })
      .filter((a): a is NonNullable<typeof a> => a !== null);
  }, [dependencies, geo]);

  // group day columns by month for the header
  const months = useMemo(() => {
    const out: { label: string; span: number }[] = [];
    for (const d of days) {
      const label = format(d, "MMMM yyyy");
      const last = out[out.length - 1];
      if (last && last.label === label) last.span += 1;
      else out.push({ label, span: 1 });
    }
    return out;
  }, [days]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="inline-block min-w-full">
        {/* header */}
        <div className="sticky top-0 z-20 flex bg-cu-bg">
          <div
            className="sticky left-0 z-30 shrink-0 border-b border-r border-cu-border bg-cu-bg"
            style={{ width: NAME_W }}
          >
            <div className="flex h-[44px] items-end px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
              Name
            </div>
          </div>
          <div>
            {/* month row */}
            <div className="flex border-b border-cu-border">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="shrink-0 px-2 py-1 text-[11px] font-semibold text-cu-text-secondary"
                  style={{ width: m.span * DAY_W }}
                >
                  {m.label}
                </div>
              ))}
            </div>
            {/* day row */}
            <div className="flex border-b border-cu-border">
              {days.map((d) => (
                <div
                  key={+d}
                  className={cn(
                    "shrink-0 text-center text-[10px] leading-tight",
                    isWeekend(d) ? "bg-cu-sidebar/50 text-cu-text-tertiary" : "text-cu-text-secondary",
                  )}
                  style={{ width: DAY_W }}
                >
                  <div className="pt-0.5">{format(d, "EEEEE")}</div>
                  <div className={cn(isToday(d) && "mx-auto flex h-4 w-4 items-center justify-center rounded-full bg-cu-purple text-white")}>
                    {format(d, "d")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* rows */}
        <div className="relative">
          {tasks.map((task) => (
            <GanttRow key={task.id} task={task} start={start} days={days} onOpenTask={onOpenTask} />
          ))}
          {arrows.length > 0 && (
            <svg
              className="pointer-events-none absolute top-0 z-[5] overflow-visible"
              style={{ left: NAME_W, width: days.length * DAY_W, height: tasks.length * ROW_H }}
            >
              <defs>
                <marker
                  id="gantt-arrowhead"
                  markerWidth="6"
                  markerHeight="6"
                  refX="5"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L6,3 L0,6 Z" fill="#9aa1ad" />
                </marker>
              </defs>
              {arrows.map((a) => {
                const gap = 18;
                const d = `M ${a.x1} ${a.y1} C ${a.x1 + gap} ${a.y1}, ${a.x2 - gap} ${a.y2}, ${a.x2 - 2} ${a.y2}`;
                return (
                  <path
                    key={a.id}
                    d={d}
                    fill="none"
                    stroke="#9aa1ad"
                    strokeWidth={1.5}
                    markerEnd="url(#gantt-arrowhead)"
                  />
                );
              })}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

function GanttRow({
  task,
  start,
  days,
  onOpenTask,
}: {
  task: TaskWithRelations;
  start: Date;
  days: Date[];
  onOpenTask: (id: string) => void;
}) {
  const s = task.startDate ? startOfDay(new Date(task.startDate)) : task.dueDate ? startOfDay(new Date(task.dueDate)) : null;
  const e = task.dueDate ? startOfDay(new Date(task.dueDate)) : s;

  const offset = s ? differenceInCalendarDays(s, start) : 0;
  const span = s && e ? differenceInCalendarDays(e, s) + 1 : 0;

  return (
    <div className="flex border-b border-cu-border/60 hover:bg-cu-hover/40">
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-cu-border bg-cu-bg px-3"
        style={{ width: NAME_W }}
      >
        <StatusCircle status={task.status} size={14} />
        <button onClick={() => onOpenTask(task.id)} className="truncate text-left text-[13px] hover:text-cu-purple">
          {task.name}
        </button>
      </div>
      <div className="relative" style={{ width: days.length * DAY_W, height: 38 }}>
        {/* weekend shading */}
        <div className="absolute inset-0 flex">
          {days.map((d) => (
            <div
              key={+d}
              className={cn("shrink-0 border-r border-cu-border/30", isWeekend(d) && "bg-cu-sidebar/40")}
              style={{ width: DAY_W }}
            />
          ))}
        </div>
        {span > 0 && (
          <button
            onClick={() => onOpenTask(task.id)}
            className="absolute top-1/2 flex h-5 -translate-y-1/2 items-center gap-1 rounded-full px-2 text-[11px] font-medium text-white shadow-sm hover:brightness-95"
            style={{
              left: offset * DAY_W + 3,
              width: span * DAY_W - 6,
              backgroundColor: task.status.color,
            }}
          >
            <span className="truncate">{task.name}</span>
            {task.assignees.length > 0 && (
              <span className="ml-auto shrink-0">
                <AvatarStack users={task.assignees.map((a) => a.user)} size="xs" max={2} />
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
