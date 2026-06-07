"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  startOfDay,
  isBefore,
  isToday,
  isWithinInterval,
  addDays,
  format,
} from "date-fns";
import { CalendarClock, ChevronDown } from "lucide-react";
import { useMyTasks, type MyTask } from "@/lib/hooks";
import { useWorkspace } from "@/components/workspace-context";
import { StatusCircle } from "@/components/menus/status-control";
import { PriorityFlag } from "@/components/ui/primitives";
import type { Priority, StatusType } from "@/lib/enums";
import { cn } from "@/lib/utils";

type BucketKey = "overdue" | "today" | "upcoming" | "later" | "none";

const BUCKETS: { key: BucketKey; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Next 7 days" },
  { key: "later", label: "Later" },
  { key: "none", label: "No due date" },
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { currentUser } = useWorkspace();
  const { data, isLoading } = useMyTasks();

  const { buckets, done } = useMemo(() => {
    const today = startOfDay(new Date());
    const weekEnd = addDays(today, 7);
    const buckets: Record<BucketKey, MyTask[]> = {
      overdue: [],
      today: [],
      upcoming: [],
      later: [],
      none: [],
    };
    const done: MyTask[] = [];
    for (const t of data?.tasks ?? []) {
      if (t.status.type === "DONE" || t.status.type === "CLOSED") {
        done.push(t);
        continue;
      }
      if (!t.dueDate) {
        buckets.none.push(t);
        continue;
      }
      const due = startOfDay(new Date(t.dueDate));
      if (isToday(due)) buckets.today.push(t);
      else if (isBefore(due, today)) buckets.overdue.push(t);
      else if (isWithinInterval(due, { start: today, end: weekEnd })) buckets.upcoming.push(t);
      else buckets.later.push(t);
    }
    return { buckets, done };
  }, [data]);

  const total = data?.tasks.length ?? 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-cu-text">
            {greeting()}, {currentUser.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-[13px] text-cu-text-secondary">
            {format(new Date(), "EEEE, MMMM d")} ·{" "}
            {total === 0 ? "Nothing assigned to you" : `${total} task${total === 1 ? "" : "s"} assigned to you`}
          </p>
        </div>

        {isLoading && <p className="text-[13px] text-cu-text-tertiary">Loading…</p>}

        {!isLoading && total === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-cu-border py-16 text-center">
            <CalendarClock className="h-8 w-8 text-cu-text-tertiary" />
            <p className="text-[14px] font-medium text-cu-text">You&apos;re all clear</p>
            <p className="text-[13px] text-cu-text-tertiary">Tasks assigned to you will show up here.</p>
          </div>
        )}

        <div className="space-y-5">
          {BUCKETS.map(({ key, label }) =>
            buckets[key].length > 0 ? (
              <Section key={key} label={label} count={buckets[key].length} accent={key === "overdue"}>
                {buckets[key].map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </Section>
            ) : null,
          )}

          {done.length > 0 && <DoneSection tasks={done} />}
        </div>
      </div>
    </div>
  );
}

function Section({
  label,
  count,
  accent,
  children,
}: {
  label: string;
  count: number;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className={cn(
          "mb-1.5 flex items-center gap-2 text-[13px] font-semibold",
          accent ? "text-cu-urgent" : "text-cu-text-secondary",
        )}
      >
        {label}
        <span className="text-cu-text-tertiary">{count}</span>
      </h2>
      <div className="overflow-hidden rounded-lg border border-cu-border">{children}</div>
    </section>
  );
}

function DoneSection({ tasks }: { tasks: MyTask[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section>
      <button
        onClick={() => setOpen((o) => !o)}
        className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-cu-text-secondary hover:text-cu-text"
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
        Completed
        <span className="text-cu-text-tertiary">{tasks.length}</span>
      </button>
      {open && (
        <div className="overflow-hidden rounded-lg border border-cu-border">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} muted />
          ))}
        </div>
      )}
    </section>
  );
}

function TaskRow({ task, muted }: { task: MyTask; muted?: boolean }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/l/${task.listId}?task=${task.id}`)}
      className="flex w-full items-center gap-2.5 border-b border-cu-border px-3 py-2 text-left last:border-0 hover:bg-cu-hover"
    >
      <StatusCircle status={{ color: task.status.color, type: task.status.type as StatusType }} size={15} />
      <span className={cn("min-w-0 flex-1 truncate text-[13px]", muted ? "text-cu-text-tertiary line-through" : "text-cu-text")}>
        {task.name}
      </span>
      {task.priority && <PriorityFlag priority={task.priority as Priority} />}
      <span
        className="shrink-0 rounded px-1.5 py-0.5 text-[11px]"
        style={{ backgroundColor: `${task.list.space.color}22`, color: task.list.space.color }}
      >
        {task.list.name}
      </span>
      {task.dueDate && (
        <span className="w-16 shrink-0 text-right text-[12px] text-cu-text-tertiary">
          {format(new Date(task.dueDate), "MMM d")}
        </span>
      )}
    </button>
  );
}
