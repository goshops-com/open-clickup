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
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListData, TaskWithRelations } from "@/lib/queries";
import { StatusCircle } from "@/components/menus/status-control";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarView({
  data,
  onOpenTask,
}: {
  data: ListData;
  onOpenTask: (id: string) => void;
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    for (const t of data.tasks) {
      if (!t.dueDate) continue;
      const key = format(new Date(t.dueDate), "yyyy-MM-dd");
      (map.get(key) ?? map.set(key, []).get(key)!).push(t);
    }
    return map;
  }, [data.tasks]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* toolbar */}
      <div className="flex items-center gap-3 px-4 py-2">
        <h2 className="text-sm font-semibold text-cu-text">{format(cursor, "MMMM yyyy")}</h2>
        <div className="flex items-center">
          <button onClick={() => setCursor((c) => subMonths(c, 1))} className="rounded p-1 hover:bg-cu-hover">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setCursor((c) => addMonths(c, 1))} className="rounded p-1 hover:bg-cu-hover">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => setCursor(startOfMonth(new Date()))}
          className="rounded border border-cu-border px-2.5 py-1 text-[13px] hover:bg-cu-hover"
        >
          Today
        </button>
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
      <div className="grid flex-1 auto-rows-fr grid-cols-7 overflow-auto">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const tasks = byDay.get(key) ?? [];
          const inMonth = isSameMonth(day, cursor);
          return (
            <div
              key={key}
              className={cn(
                "min-h-[110px] border-b border-r border-cu-border/60 p-1.5",
                !inMonth && "bg-cu-sidebar/40",
              )}
            >
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
                {tasks.slice(0, 4).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onOpenTask(t.id)}
                    className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-[11px] hover:brightness-95"
                    style={{ backgroundColor: `${t.status.color}1f`, color: t.status.color }}
                  >
                    <StatusCircle status={t.status} size={10} />
                    <span className="truncate text-cu-text">{t.name}</span>
                  </button>
                ))}
                {tasks.length > 4 && (
                  <div className="px-1 text-[11px] text-cu-text-tertiary">+{tasks.length - 4} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
