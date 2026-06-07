"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Popover from "@radix-ui/react-popover";
import { Link2, Plus, X, Search } from "lucide-react";
import { apiGet, apiSend } from "@/lib/api";
import type { TaskDetail } from "@/lib/queries";

type LinkedTask = TaskDetail["blockedBy"][number]["blocker"];
type DepType = "waiting_on" | "blocking";

type SearchResult = {
  tasks: { id: string; name: string; listId: string; status: { color: string }; list: { name: string } }[];
};

export function Dependencies({
  taskId,
  blockedBy,
  blocking,
  onChange,
}: {
  taskId: string;
  blockedBy: TaskDetail["blockedBy"];
  blocking: TaskDetail["blocking"];
  onChange: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const add = useMutation({
    mutationFn: (v: { type: DepType; otherTaskId: string }) =>
      apiSend(`/api/tasks/${taskId}/dependencies`, "POST", v),
    onSuccess: () => {
      setError(null);
      onChange();
    },
    onError: (e: Error) => setError(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiSend(`/api/dependencies/${id}`, "DELETE"),
    onSuccess: onChange,
  });

  const hasAny = blockedBy.length > 0 || blocking.length > 0;

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-cu-text-secondary">
          <Link2 className="h-4 w-4" /> Dependencies
        </h3>
        <AddDependency
          excludeId={taskId}
          onPick={(type, otherTaskId) => add.mutate({ type, otherTaskId })}
        />
      </div>

      {!hasAny && <p className="text-[12px] text-cu-text-tertiary">No dependencies.</p>}

      {blockedBy.length > 0 && (
        <DepGroup label="Waiting on">
          {blockedBy.map((d) => (
            <DepRow key={d.id} task={d.blocker} onRemove={() => remove.mutate(d.id)} />
          ))}
        </DepGroup>
      )}
      {blocking.length > 0 && (
        <DepGroup label="Blocking">
          {blocking.map((d) => (
            <DepRow key={d.id} task={d.blocked} onRemove={() => remove.mutate(d.id)} />
          ))}
        </DepGroup>
      )}

      {error && <p className="mt-1.5 text-[12px] text-cu-urgent">{error}</p>}
    </section>
  );
}

function DepGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-1.5">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
        {label}
      </div>
      <div className="overflow-hidden rounded-lg border border-cu-border">{children}</div>
    </div>
  );
}

function DepRow({ task, onRemove }: { task: LinkedTask; onRemove: () => void }) {
  const router = useRouter();
  const done = task.status.type === "DONE";
  return (
    <div className="group flex items-center gap-2 border-b border-cu-border px-3 py-2 last:border-0 hover:bg-cu-hover">
      <span
        className="h-3 w-3 shrink-0 rounded-full border-2"
        style={{ borderColor: task.status.color, backgroundColor: done ? task.status.color : "transparent" }}
      />
      <button
        onClick={() => router.push(`/l/${task.listId}?task=${task.id}`)}
        className={`min-w-0 flex-1 truncate text-left text-[13px] hover:text-cu-purple ${done ? "text-cu-text-tertiary line-through" : "text-cu-text"}`}
        title={task.name}
      >
        {task.name}
      </button>
      <button
        onClick={onRemove}
        className="rounded p-0.5 text-cu-text-tertiary opacity-0 transition-opacity hover:text-cu-urgent group-hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AddDependency({
  excludeId,
  onPick,
}: {
  excludeId: string;
  onPick: (type: DepType, otherTaskId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DepType>("waiting_on");
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["search", q],
    queryFn: () => apiGet<SearchResult>(`/api/search?q=${encodeURIComponent(q)}`),
    enabled: open && q.trim().length > 0,
  });
  const results = (data?.tasks ?? []).filter((t) => t.id !== excludeId);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[12px] text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-purple">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-50 w-[320px] overflow-hidden rounded-lg border border-cu-border bg-cu-panel shadow-lg"
        >
          <div className="flex border-b border-cu-border p-1">
            {(["waiting_on", "blocking"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 rounded px-2 py-1 text-[12px] font-medium ${
                  type === t ? "bg-cu-purple-light text-cu-purple" : "text-cu-text-secondary hover:bg-cu-hover"
                }`}
              >
                {t === "waiting_on" ? "Waiting on" : "Blocking"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 border-b border-cu-border px-2.5 py-2">
            <Search className="h-3.5 w-3.5 text-cu-text-tertiary" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tasks…"
              className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-cu-text-tertiary"
            />
          </div>
          <div className="max-h-[260px] overflow-y-auto py-1">
            {q.trim() === "" && (
              <p className="px-3 py-3 text-[12px] text-cu-text-tertiary">Type to search tasks.</p>
            )}
            {q.trim() !== "" && results.length === 0 && (
              <p className="px-3 py-3 text-[12px] text-cu-text-tertiary">No matches.</p>
            )}
            {results.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  onPick(type, t.id);
                  setQ("");
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-cu-hover"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: t.status.color }}
                />
                <span className="min-w-0 flex-1 truncate text-[13px]">{t.name}</span>
                <span className="shrink-0 text-[11px] text-cu-text-tertiary">{t.list.name}</span>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
