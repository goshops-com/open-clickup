"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  addDays,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DueDate } from "@/components/ui/primitives";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function DateControl({
  value,
  onChange,
  done,
  placeholder = "Set date",
  align = "start",
  children,
}: {
  value: Date | string | null;
  onChange: (date: Date | null) => void;
  done?: boolean;
  placeholder?: string;
  align?: "start" | "center" | "end";
  children?: React.ReactNode;
}) {
  const current = value ? (typeof value === "string" ? new Date(value) : value) : null;
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => startOfMonth(current ?? new Date()));
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor)),
    end: endOfWeek(endOfMonth(cursor)),
  });

  function pick(d: Date | null) {
    onChange(d);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 rounded text-left outline-none"
        >
          {children ??
            (current ? (
              <DueDate date={current} done={done} />
            ) : (
              <span className="flex items-center gap-1 text-[13px] text-cu-text-tertiary hover:text-cu-text-secondary">
                <CalendarIcon className="h-3.5 w-3.5" /> {placeholder}
              </span>
            ))}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align={align}
          onClick={(e) => e.stopPropagation()}
          className="z-50 w-[248px] rounded-lg border border-cu-border bg-cu-panel p-2 shadow-lg"
        >
          {/* quick actions */}
          <div className="mb-2 flex gap-1">
            {[
              { label: "Today", d: 0 },
              { label: "Tomorrow", d: 1 },
              { label: "Next week", d: 7 },
            ].map((q) => (
              <button
                key={q.label}
                onClick={() => pick(atFive(addDays(new Date(), q.d)))}
                className="flex-1 rounded border border-cu-border px-1 py-1 text-[11px] hover:bg-cu-hover"
              >
                {q.label}
              </button>
            ))}
          </div>

          <div className="mb-1 flex items-center justify-between px-1">
            <span className="text-[13px] font-semibold">{format(cursor, "MMMM yyyy")}</span>
            <div className="flex">
              <button onClick={() => setCursor((c) => subMonths(c, 1))} className="rounded p-0.5 hover:bg-cu-hover">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setCursor((c) => addMonths(c, 1))} className="rounded p-0.5 hover:bg-cu-hover">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="py-1 text-[10px] font-semibold text-cu-text-tertiary">{d}</div>
            ))}
            {days.map((day) => {
              const selected = current && isSameDay(day, current);
              const inMonth = isSameMonth(day, cursor);
              return (
                <button
                  key={+day}
                  onClick={() => pick(atFive(day))}
                  className={cn(
                    "mx-auto my-0.5 flex h-7 w-7 items-center justify-center rounded-full text-[12px]",
                    selected
                      ? "bg-cu-purple font-semibold text-white"
                      : isToday(day)
                        ? "font-semibold text-cu-purple hover:bg-cu-hover"
                        : inMonth
                          ? "text-cu-text hover:bg-cu-hover"
                          : "text-cu-text-tertiary hover:bg-cu-hover",
                  )}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>

          {current && (
            <button
              onClick={() => pick(null)}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-cu-border py-1 text-[12px] text-cu-text-secondary hover:bg-cu-hover"
            >
              <X className="h-3.5 w-3.5" /> Clear date
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function atFive(d: Date): Date {
  const x = new Date(d);
  x.setHours(17, 0, 0, 0);
  return x;
}
