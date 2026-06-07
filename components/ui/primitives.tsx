"use client";

import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_CONFIG } from "@/lib/constants";
import { Priority } from "@/lib/enums";
import { differenceInCalendarDays, format, isToday, isTomorrow, isYesterday } from "date-fns";

export function PriorityFlag({
  priority,
  className,
  muted,
}: {
  priority: Priority | null;
  className?: string;
  muted?: boolean;
}) {
  if (!priority) {
    return (
      <Flag
        className={cn("h-3.5 w-3.5 text-cu-text-tertiary", className)}
        strokeWidth={1.75}
      />
    );
  }
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <Flag
      className={cn("h-3.5 w-3.5", muted && "opacity-90", className)}
      style={{ color: cfg.color, fill: cfg.color }}
      strokeWidth={1.75}
    />
  );
}

export function StatusDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}

export function StatusBadge({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        className,
      )}
      style={{ color, backgroundColor: `${color}1f` }}
    >
      {name}
    </span>
  );
}

export function TagChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color, backgroundColor: `${color}22` }}
    >
      {name}
    </span>
  );
}

export function DueDate({
  date,
  done,
  className,
}: {
  date: Date | string | null;
  done?: boolean;
  className?: string;
}) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = differenceInCalendarDays(d, new Date());
  const overdue = diff < 0 && !done;
  const soon = diff === 0 || diff === 1;

  let label: string;
  if (isToday(d)) label = "Today";
  else if (isTomorrow(d)) label = "Tomorrow";
  else if (isYesterday(d)) label = "Yesterday";
  else label = format(d, "MMM d");

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs whitespace-nowrap",
        overdue ? "text-cu-urgent font-medium" : soon && !done ? "text-[#ff7800]" : "text-cu-text-secondary",
        className,
      )}
    >
      {label}
    </span>
  );
}
