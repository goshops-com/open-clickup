"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import { useQueryClient } from "@tanstack/react-query";
import { X, Plus, Trash2, ChevronUp, ChevronDown, Check } from "lucide-react";
import { apiSend } from "@/lib/api";
import type { StatusModel } from "@/lib/queries";
import { StatusType } from "@/lib/enums";
import { StatusCircle } from "@/components/menus/status-control";

const PALETTE = [
  "#87909e", "#5b9fff", "#a875ff", "#6bc950", "#f50000", "#ff7800",
  "#ffcc00", "#fd71af", "#1bbc9c", "#0ab1e8", "#9b59b6", "#656f7d",
];

const TYPE_LABELS: Record<StatusType, string> = {
  NOT_STARTED: "Not started",
  ACTIVE: "Active",
  DONE: "Done",
  CLOSED: "Closed",
};

export function StatusManager({
  listId,
  statuses,
  onClose,
}: {
  listId: string;
  statuses: StatusModel[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["list", listId] });

  async function patch(id: string, data: Partial<StatusModel>) {
    await apiSend(`/api/statuses/${id}`, "PATCH", data);
    refresh();
  }
  async function remove(id: string) {
    await apiSend(`/api/statuses/${id}`, "DELETE");
    refresh();
  }
  async function add() {
    if (!newName.trim()) return;
    await apiSend(`/api/lists/${listId}/statuses`, "POST", { name: newName.trim() });
    setNewName("");
    refresh();
  }
  async function move(index: number, dir: -1 | 1) {
    const next = [...statuses];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    await apiSend(`/api/lists/${listId}/statuses`, "PUT", { ids: next.map((s) => s.id) });
    refresh();
  }

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-[min(520px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-cu-border bg-cu-panel shadow-2xl outline-none"
        >
          <div className="flex items-center justify-between border-b border-cu-border px-4 py-3">
            <Dialog.Title className="text-sm font-semibold">Statuses</Dialog.Title>
            <Dialog.Close className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-3">
            {statuses.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-cu-hover/50">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-cu-text-tertiary hover:text-cu-text disabled:opacity-20">
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === statuses.length - 1} className="text-cu-text-tertiary hover:text-cu-text disabled:opacity-20">
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>

                <ColorSwatch color={s.color} status={s} onPick={(color) => patch(s.id, { color })} />

                <input
                  defaultValue={s.name}
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== s.name) patch(s.id, { name: v }); }}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                  className="flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] font-medium uppercase tracking-wide outline-none hover:border-cu-border focus:border-cu-purple"
                  style={{ color: s.color }}
                />

                <select
                  value={s.type}
                  onChange={(e) => patch(s.id, { type: e.target.value as StatusType })}
                  className="rounded border border-cu-border bg-cu-panel px-1.5 py-1 text-[12px] text-cu-text-secondary outline-none"
                >
                  {(Object.keys(TYPE_LABELS) as StatusType[]).map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>

                <button
                  onClick={() => remove(s.id)}
                  disabled={statuses.length <= 1}
                  className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-urgent disabled:opacity-20"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* add row */}
            <div className="mt-2 flex items-center gap-2 border-t border-cu-border pt-3">
              <Plus className="h-4 w-4 text-cu-text-tertiary" />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") add(); }}
                placeholder="New status name"
                className="flex-1 rounded border border-cu-border px-2 py-1.5 text-[13px] outline-none focus:border-cu-purple"
              />
              <button
                onClick={add}
                disabled={!newName.trim()}
                className="rounded bg-cu-purple px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-40 hover:bg-cu-purple-dark"
              >
                Add
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ColorSwatch({
  color,
  status,
  onPick,
}: {
  color: string;
  status: StatusModel;
  onPick: (color: string) => void;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="flex items-center justify-center rounded p-0.5 hover:bg-cu-hover">
          <StatusCircle status={{ color, type: status.type }} size={16} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} className="z-[60] grid grid-cols-6 gap-1.5 rounded-lg border border-cu-border bg-cu-panel p-2 shadow-lg">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => onPick(c)}
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{ backgroundColor: c }}
            >
              {c === color && <Check className="h-3.5 w-3.5 text-white" />}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
