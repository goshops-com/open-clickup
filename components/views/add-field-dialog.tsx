"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { X, Plus, Trash2 } from "lucide-react";
import { apiSend } from "@/lib/api";
import { CustomFieldType } from "@/lib/enums";

const TYPE_OPTIONS: { value: CustomFieldType; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "TEXTAREA", label: "Text (long)" },
  { value: "NUMBER", label: "Number" },
  { value: "MONEY", label: "Money" },
  { value: "DROPDOWN", label: "Dropdown" },
  { value: "LABELS", label: "Labels" },
  { value: "DATE", label: "Date" },
  { value: "CHECKBOX", label: "Checkbox" },
  { value: "RATING", label: "Rating" },
  { value: "URL", label: "URL" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
];

export function AddFieldDialog({ listId, onClose }: { listId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<CustomFieldType>("TEXT");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const needsOptions = type === "DROPDOWN" || type === "LABELS";

  async function submit() {
    if (!name.trim()) return;
    await apiSend(`/api/lists/${listId}/custom-fields`, "POST", {
      name: name.trim(),
      type,
      options: needsOptions ? options.filter((o) => o.trim()) : undefined,
    });
    qc.invalidateQueries({ queryKey: ["list", listId] });
    onClose();
  }

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-cu-border bg-cu-panel shadow-2xl outline-none"
        >
          <div className="flex items-center justify-between border-b border-cu-border px-4 py-3">
            <Dialog.Title className="text-sm font-semibold">New custom field</Dialog.Title>
            <Dialog.Close className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-3 p-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">Name</label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Field name"
                className="w-full rounded border border-cu-border px-2.5 py-1.5 text-[13px] outline-none focus:border-cu-purple"
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as CustomFieldType)}
                className="w-full rounded border border-cu-border bg-cu-panel px-2.5 py-1.5 text-[13px] outline-none focus:border-cu-purple"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {needsOptions && (
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">Options</label>
                <div className="space-y-1.5">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={opt}
                        onChange={(e) => setOptions((o) => o.map((x, j) => (j === i ? e.target.value : x)))}
                        placeholder={`Option ${i + 1}`}
                        className="flex-1 rounded border border-cu-border px-2 py-1 text-[13px] outline-none focus:border-cu-purple"
                      />
                      <button
                        onClick={() => setOptions((o) => o.filter((_, j) => j !== i))}
                        className="rounded p-1 text-cu-text-tertiary hover:text-cu-urgent"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setOptions((o) => [...o, ""])}
                    className="flex items-center gap-1 text-[12px] text-cu-text-secondary hover:text-cu-text"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add option
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-cu-border px-4 py-3">
            <Dialog.Close className="rounded px-3 py-1.5 text-[13px] text-cu-text-secondary hover:bg-cu-hover">Cancel</Dialog.Close>
            <button
              onClick={submit}
              disabled={!name.trim() || (needsOptions && !options.some((o) => o.trim()))}
              className="rounded bg-cu-purple px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-40 hover:bg-cu-purple-dark"
            >
              Create field
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
