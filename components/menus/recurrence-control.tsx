"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Repeat } from "lucide-react";
import { RECURRENCE_OPTIONS, recurrenceLabel } from "@/lib/recurrence";

export function RecurrenceControl({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const active = value ?? "";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[13px] outline-none hover:bg-cu-hover ${
            value ? "text-cu-purple" : "text-cu-text-tertiary"
          }`}
        >
          <Repeat className="h-3.5 w-3.5" />
          {recurrenceLabel(value)}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="start"
          className="z-50 min-w-[200px] rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg"
        >
          {RECURRENCE_OPTIONS.map((o) => (
            <DropdownMenu.Item
              key={o.value || "none"}
              onSelect={() => onChange(o.value || null)}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] outline-none hover:bg-cu-hover focus:bg-cu-hover"
            >
              <span className="flex-1">{o.label}</span>
              {active === o.value && <Check className="h-4 w-4 text-cu-purple" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
