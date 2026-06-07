"use client";

import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomFieldWithOptions } from "@/lib/queries";
import { CustomFieldType } from "@/lib/enums";
import { DateControl } from "@/components/menus/date-control";

export function CustomFieldControl({
  field,
  value,
  onChange,
  compact,
}: {
  field: CustomFieldWithOptions;
  value: unknown;
  onChange: (value: unknown) => void;
  compact?: boolean;
}) {
  // inline types (no popover)
  if (field.type === CustomFieldType.CHECKBOX) {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        className="h-3.5 w-3.5 accent-[var(--cu-purple)]"
      />
    );
  }

  if (field.type === CustomFieldType.RATING) {
    const n = Number(value) || 0;
    return (
      <span className="flex" onClick={(e) => e.stopPropagation()}>
        {Array.from({ length: 5 }).map((_, i) => (
          <button key={i} onClick={() => onChange(i + 1 === n ? 0 : i + 1)}>
            <Star className={cn("h-3.5 w-3.5", i < n ? "fill-[#ffcc00] text-[#ffcc00]" : "text-cu-border-strong hover:text-[#ffcc00]")} />
          </button>
        ))}
      </span>
    );
  }

  if (field.type === CustomFieldType.DATE) {
    return (
      <DateControl
        value={typeof value === "string" ? value : null}
        onChange={(d) => onChange(d ? d.toISOString() : null)}
        placeholder={compact ? "" : "Set date"}
      />
    );
  }

  if (field.type === CustomFieldType.DROPDOWN || field.type === CustomFieldType.LABELS) {
    return <OptionPicker field={field} value={value} onChange={onChange} multi={field.type === CustomFieldType.LABELS} />;
  }

  // text-like + number
  return <TextEditor field={field} value={value} onChange={onChange} />;
}

function OptionPicker({
  field,
  value,
  onChange,
  multi,
}: {
  field: CustomFieldWithOptions;
  value: unknown;
  onChange: (v: unknown) => void;
  multi: boolean;
}) {
  const selected = new Set(multi ? ((value as string[]) ?? []) : value ? [value as string] : []);
  function toggle(id: string) {
    if (multi) {
      const next = new Set(selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onChange([...next]);
    } else {
      onChange(selected.has(id) ? null : id);
    }
  }
  const chosen = field.options.filter((o) => selected.has(o.id));

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button onClick={(e) => e.stopPropagation()} className="flex flex-wrap items-center gap-1 outline-none">
          {chosen.length ? (
            chosen.map((o) => (
              <span key={o.id} className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: o.color, backgroundColor: `${o.color}22` }}>
                {o.label}
              </span>
            ))
          ) : (
            <span className="text-[13px] text-cu-text-tertiary">—</span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} align="start" onClick={(e) => e.stopPropagation()} className="z-50 min-w-[180px] rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg">
          {field.options.map((o) => (
            <button key={o.id} onClick={() => toggle(o.id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] hover:bg-cu-hover">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: o.color }} />
              <span className="flex-1 truncate">{o.label}</span>
              {selected.has(o.id) && <Check className="h-3.5 w-3.5 text-cu-purple" />}
            </button>
          ))}
          {!field.options.length && <div className="px-2 py-2 text-[12px] text-cu-text-tertiary">No options</div>}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function TextEditor({
  field,
  value,
  onChange,
}: {
  field: CustomFieldWithOptions;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const isNumber = field.type === CustomFieldType.NUMBER || field.type === CustomFieldType.MONEY;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    const v = draft.trim();
    onChange(v === "" ? null : isNumber ? Number(v) : v);
    setOpen(false);
  }

  const display = value == null || value === "" ? null : String(value);

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(display ?? ""); }}>
      <Popover.Trigger asChild>
        <button onClick={(e) => e.stopPropagation()} className="w-full truncate text-left text-[13px] outline-none">
          {display ? (
            <span className="text-cu-text">{field.type === CustomFieldType.MONEY ? "$" : ""}{display}</span>
          ) : (
            <span className="text-cu-text-tertiary">—</span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} align="start" onClick={(e) => e.stopPropagation()} className="z-50 w-[220px] rounded-lg border border-cu-border bg-cu-panel p-1.5 shadow-lg">
          <input
            autoFocus
            type={isNumber ? "number" : "text"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setOpen(false); }}
            onBlur={commit}
            placeholder={field.name}
            className="w-full rounded border border-cu-border px-2 py-1 text-[13px] outline-none focus:border-cu-purple"
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
