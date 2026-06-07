"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomFieldWithOptions } from "@/lib/queries";
import { CustomFieldType } from "@/lib/enums";

type CFValue = { customFieldId: string; value: unknown };

export function CustomFieldCell({
  field,
  values,
  compact,
}: {
  field: CustomFieldWithOptions;
  values: CFValue[];
  compact?: boolean;
}) {
  const entry = values.find((v) => v.customFieldId === field.id);
  const value = entry?.value;

  if (value == null || value === "") {
    return <span className="text-cu-text-tertiary">{compact ? "" : "—"}</span>;
  }

  switch (field.type) {
    case CustomFieldType.NUMBER:
    case CustomFieldType.MONEY:
      return (
        <span className="text-[13px] tabular-nums text-cu-text">
          {field.type === CustomFieldType.MONEY ? "$" : ""}
          {String(value)}
        </span>
      );

    case CustomFieldType.DROPDOWN: {
      const opt = field.options.find((o) => o.id === value);
      if (!opt) return <span className="text-cu-text-tertiary">—</span>;
      return (
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{ color: opt.color, backgroundColor: `${opt.color}22` }}
        >
          {opt.label}
        </span>
      );
    }

    case CustomFieldType.LABELS: {
      const ids = Array.isArray(value) ? (value as string[]) : [];
      return (
        <span className="flex flex-wrap gap-1">
          {ids.map((id) => {
            const opt = field.options.find((o) => o.id === id);
            if (!opt) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={{ color: opt.color, backgroundColor: `${opt.color}22` }}
              >
                {opt.label}
              </span>
            );
          })}
        </span>
      );
    }

    case CustomFieldType.CHECKBOX:
      return (
        <input
          type="checkbox"
          checked={!!value}
          readOnly
          className="h-3.5 w-3.5 accent-[var(--cu-purple)]"
        />
      );

    case CustomFieldType.RATING: {
      const n = Number(value);
      return (
        <span className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn("h-3.5 w-3.5", i < n ? "fill-[#ffcc00] text-[#ffcc00]" : "text-cu-border-strong")}
            />
          ))}
        </span>
      );
    }

    case CustomFieldType.URL:
      return (
        <a href={String(value)} className="text-[13px] text-cu-purple hover:underline" onClick={(e) => e.stopPropagation()}>
          {String(value)}
        </a>
      );

    default:
      return <span className="truncate text-[13px] text-cu-text">{String(value)}</span>;
  }
}
