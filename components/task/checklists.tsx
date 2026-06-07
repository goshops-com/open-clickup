"use client";

import { useState } from "react";
import * as Checkbox from "@radix-ui/react-checkbox";
import { Check, Plus, Trash2, SquareCheckBig } from "lucide-react";
import { apiSend } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { TaskDetail } from "@/lib/queries";

type ChecklistData = TaskDetail["checklists"][number];

export function Checklists({
  taskId,
  checklists,
  onChange,
}: {
  taskId: string;
  checklists: ChecklistData[];
  onChange: () => void;
}) {
  async function addChecklist() {
    await apiSend(`/api/tasks/${taskId}/checklists`, "POST", {});
    onChange();
  }

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-cu-text-secondary">
        <SquareCheckBig className="h-4 w-4" /> Checklists
      </div>

      {checklists.map((cl) => (
        <ChecklistBlock key={cl.id} checklist={cl} onChange={onChange} />
      ))}

      <button
        onClick={addChecklist}
        className="mt-2 flex items-center gap-1.5 rounded px-1 py-1 text-[13px] text-cu-text-tertiary hover:text-cu-text-secondary"
      >
        <Plus className="h-3.5 w-3.5" /> Add checklist
      </button>
    </section>
  );
}

function ChecklistBlock({ checklist, onChange }: { checklist: ChecklistData; onChange: () => void }) {
  const [adding, setAdding] = useState("");
  const done = checklist.items.filter((i) => i.resolved).length;
  const total = checklist.items.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  async function toggle(itemId: string, resolved: boolean) {
    await apiSend(`/api/checklist-items/${itemId}`, "PATCH", { resolved });
    onChange();
  }
  async function rename(itemId: string, name: string) {
    await apiSend(`/api/checklist-items/${itemId}`, "PATCH", { name });
    onChange();
  }
  async function removeItem(itemId: string) {
    await apiSend(`/api/checklist-items/${itemId}`, "DELETE");
    onChange();
  }
  async function addItem() {
    if (!adding.trim()) return;
    await apiSend(`/api/checklists/${checklist.id}/items`, "POST", { name: adding.trim() });
    setAdding("");
    onChange();
  }
  async function removeChecklist() {
    await apiSend(`/api/checklists/${checklist.id}`, "DELETE");
    onChange();
  }

  return (
    <div className="mb-3 rounded-lg border border-cu-border">
      <div className="flex items-center gap-2 border-b border-cu-border px-3 py-2">
        <span className="text-[13px] font-semibold">{checklist.name}</span>
        <span className="text-[11px] text-cu-text-tertiary">{done}/{total}</span>
        <div className="ml-2 h-1.5 w-24 overflow-hidden rounded-full bg-cu-hover-strong">
          <div className="h-full rounded-full bg-cu-purple transition-all" style={{ width: `${pct}%` }} />
        </div>
        <button onClick={removeChecklist} className="ml-auto rounded p-1 text-cu-text-tertiary hover:bg-cu-hover hover:text-cu-urgent">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-1.5">
        {checklist.items.map((item) => (
          <div key={item.id} className="group flex items-center gap-2 rounded px-1.5 py-1 hover:bg-cu-hover/60">
            <Checkbox.Root
              checked={item.resolved}
              onCheckedChange={(c) => toggle(item.id, !!c)}
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                item.resolved ? "border-cu-purple bg-cu-purple" : "border-cu-border-strong",
              )}
            >
              <Checkbox.Indicator>
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </Checkbox.Indicator>
            </Checkbox.Root>
            <input
              defaultValue={item.name}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== item.name) rename(item.id, v); }}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className={cn(
                "flex-1 bg-transparent text-[13px] outline-none",
                item.resolved && "text-cu-text-tertiary line-through",
              )}
            />
            <button onClick={() => removeItem(item.id)} className="hidden rounded p-0.5 text-cu-text-tertiary hover:text-cu-urgent group-hover:block">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2 px-1.5 py-1">
          <Plus className="h-4 w-4 text-cu-text-tertiary" />
          <input
            value={adding}
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
            placeholder="Add an item"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-cu-text-tertiary"
          />
        </div>
      </div>
    </div>
  );
}
