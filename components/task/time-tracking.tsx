"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Clock, Play, Square, Plus, X, Pencil } from "lucide-react";
import { apiSend } from "@/lib/api";
import type { TaskDetail } from "@/lib/queries";
import { formatDuration, formatClock, parseDuration } from "@/lib/time";
import { Avatar } from "@/components/ui/avatar";

type TimeEntry = TaskDetail["timeEntries"][number];

export function TimeTracking({
  taskId,
  currentUserId,
  timeEstimate,
  entries,
  onChange,
}: {
  taskId: string;
  currentUserId: string;
  timeEstimate: number | null; // minutes
  entries: TimeEntry[];
  onChange: () => void;
}) {
  const running = entries.find((e) => e.endedAt === null);
  const myRunning = running && running.userId === currentUserId;
  const logged = entries.reduce(
    (sum, e) => sum + (e.endedAt === null ? liveSeconds(e.startedAt) : e.duration),
    0,
  );
  const estimateSec = (timeEstimate ?? 0) * 60;

  const start = useMutation({
    mutationFn: () => apiSend(`/api/tasks/${taskId}/time`, "POST", { action: "start" }),
    onSuccess: onChange,
  });
  const stop = useMutation({
    mutationFn: () => apiSend(`/api/tasks/${taskId}/time`, "POST", { action: "stop" }),
    onSuccess: onChange,
  });
  const log = useMutation({
    mutationFn: (v: { durationSeconds: number; description?: string }) =>
      apiSend(`/api/tasks/${taskId}/time`, "POST", { action: "log", ...v }),
    onSuccess: onChange,
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiSend(`/api/time-entries/${id}`, "DELETE"),
    onSuccess: onChange,
  });
  const setEstimate = useMutation({
    mutationFn: (minutes: number | null) =>
      apiSend(`/api/tasks/${taskId}`, "PATCH", { timeEstimate: minutes }),
    onSuccess: onChange,
  });

  return (
    <section className="mt-6">
      <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-cu-text-secondary">
        <Clock className="h-4 w-4" /> Time tracking
      </h3>

      <div className="rounded-lg border border-cu-border p-3">
        {/* summary */}
        <div className="flex items-center gap-4 text-[13px]">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-cu-text-tertiary">Logged</div>
            <LiveTotal entries={entries} fallback={logged} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-cu-text-tertiary">Estimate</div>
            <EstimateEditor
              minutes={timeEstimate}
              onSave={(m) => setEstimate.mutate(m)}
            />
          </div>
          <div className="ml-auto">
            {myRunning ? (
              <button
                onClick={() => stop.mutate()}
                className="flex items-center gap-1.5 rounded-md bg-cu-urgent px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90"
              >
                <Square className="h-3.5 w-3.5 fill-current" /> Stop
              </button>
            ) : (
              <button
                onClick={() => start.mutate()}
                disabled={start.isPending}
                className="flex items-center gap-1.5 rounded-md bg-cu-purple px-3 py-1.5 text-[13px] font-medium text-white hover:bg-cu-purple-dark disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> Start timer
              </button>
            )}
          </div>
        </div>

        {/* progress vs estimate */}
        {estimateSec > 0 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cu-hover-strong">
            <div
              className={`h-full rounded-full ${logged > estimateSec ? "bg-cu-urgent" : "bg-cu-purple"}`}
              style={{ width: `${Math.min(100, (logged / estimateSec) * 100)}%` }}
            />
          </div>
        )}

        {/* manual add */}
        <ManualAdd onAdd={(durationSeconds, description) => log.mutate({ durationSeconds, description })} />

        {/* entries */}
        {entries.length > 0 && (
          <div className="mt-2 divide-y divide-cu-border/60 border-t border-cu-border/60">
            {entries.map((e) => (
              <EntryRow key={e.id} entry={e} onDelete={() => remove.mutate(e.id)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function liveSeconds(startedAt: string | Date): number {
  return Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
}

/** Total logged time; ticks every second while a timer is running. */
function LiveTotal({ entries, fallback }: { entries: TimeEntry[]; fallback: number }) {
  const hasRunning = entries.some((e) => e.endedAt === null);
  const [, force] = useState(0);
  useEffect(() => {
    if (!hasRunning) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [hasRunning]);
  const total = entries.reduce(
    (sum, e) => sum + (e.endedAt === null ? liveSeconds(e.startedAt) : e.duration),
    0,
  );
  return (
    <span className={`font-semibold tabular-nums ${hasRunning ? "text-cu-purple" : "text-cu-text"}`}>
      {hasRunning ? formatClock(total) : formatDuration(fallback)}
    </span>
  );
}

function EstimateEditor({ minutes, onSave }: { minutes: number | null; onSave: (m: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState("");
  if (editing) {
    return (
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const sec = parseDuration(v);
          onSave(sec === null ? (v.trim() === "" ? null : minutes) : Math.round(sec / 60));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditing(false);
        }}
        placeholder="e.g. 2h 30m"
        className="w-20 rounded border border-cu-border bg-cu-bg px-1 py-0.5 text-[13px] outline-none focus:border-cu-purple"
      />
    );
  }
  return (
    <button
      onClick={() => {
        setV(minutes ? formatDuration(minutes * 60) : "");
        setEditing(true);
      }}
      className="group flex items-center gap-1 font-semibold text-cu-text hover:text-cu-purple"
    >
      {minutes ? formatDuration(minutes * 60) : <span className="text-cu-text-tertiary">Set</span>}
      <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function ManualAdd({ onAdd }: { onAdd: (seconds: number, description?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState("");
  const [desc, setDesc] = useState("");
  const seconds = parseDuration(time);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1 text-[12px] text-cu-text-tertiary hover:text-cu-purple"
      >
        <Plus className="h-3.5 w-3.5" /> Add time
      </button>
    );
  }
  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        autoFocus
        value={time}
        onChange={(e) => setTime(e.target.value)}
        placeholder="1h 30m"
        className="w-24 rounded border border-cu-border bg-cu-bg px-2 py-1 text-[13px] outline-none focus:border-cu-purple"
      />
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="Note (optional)"
        className="flex-1 rounded border border-cu-border bg-cu-bg px-2 py-1 text-[13px] outline-none focus:border-cu-purple"
        onKeyDown={(e) => {
          if (e.key === "Enter" && seconds) {
            onAdd(seconds, desc.trim() || undefined);
            setTime("");
            setDesc("");
            setOpen(false);
          }
        }}
      />
      <button
        onClick={() => {
          if (seconds) {
            onAdd(seconds, desc.trim() || undefined);
            setTime("");
            setDesc("");
            setOpen(false);
          }
        }}
        disabled={!seconds}
        className="rounded bg-cu-purple px-2.5 py-1 text-[13px] font-medium text-white disabled:opacity-40 hover:bg-cu-purple-dark"
      >
        Add
      </button>
      <button onClick={() => setOpen(false)} className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function EntryRow({ entry, onDelete }: { entry: TimeEntry; onDelete: () => void }) {
  const isRunning = entry.endedAt === null;
  return (
    <div className="group flex items-center gap-2 py-2 text-[13px]">
      <Avatar user={entry.user} size="sm" />
      <span className="text-cu-text-secondary">{entry.user.name}</span>
      {entry.description && (
        <span className="truncate text-cu-text-tertiary">— {entry.description}</span>
      )}
      <span className="ml-auto font-medium tabular-nums">
        {isRunning ? (
          <span className="flex items-center gap-1 text-cu-purple">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cu-purple" /> running
          </span>
        ) : (
          formatDuration(entry.duration)
        )}
      </span>
      {!isRunning && (
        <button
          onClick={onDelete}
          className="rounded p-0.5 text-cu-text-tertiary opacity-0 transition-opacity hover:text-cu-urgent group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
