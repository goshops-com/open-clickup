"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Repeat, X } from "lucide-react";
import { useState } from "react";
import {
  RECURRENCE_OPTIONS,
  recurrenceLabel,
  parseRecurrence,
  serializeRecurrence,
  defaultAdvancedRule,
  type AdvancedRecurrenceRule,
  type RecurrenceEnd,
  type RecurrenceFrequency,
  type RecurrenceMode,
} from "@/lib/recurrence";

const WEEKDAY_LABELS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const NTH_OPTIONS = [
  { value: 1, label: "First" },
  { value: 2, label: "Second" },
  { value: 3, label: "Third" },
  { value: 4, label: "Fourth" },
  { value: -1, label: "Last" },
];

export function RecurrenceControl({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AdvancedRecurrenceRule>(() => defaultAdvancedRule());

  const parsed = parseRecurrence(value);
  const isAdvanced = parsed.kind === "advanced";
  const active = isAdvanced ? "CUSTOM" : (value ?? "");

  const openCustom = () => {
    if (parsed.kind === "advanced") {
      setEditingRule(parsed.rule);
    } else {
      // start from a sensible default: if legacy WEEKLY, start weekly Monday, etc.
      const base = defaultAdvancedRule();
      if (value === "WEEKLY") base.weekdays = [1];
      if (value === "BIWEEKLY") {
        base.interval = 2;
        base.weekdays = [1];
      }
      if (value === "DAILY") base.frequency = "DAILY";
      if (value === "MONTHLY") base.frequency = "MONTHLY";
      setEditingRule(base);
    }
    setBuilderOpen(true);
  };

  return (
    <>
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
            className="z-50 min-w-[220px] rounded-lg border border-cu-border bg-cu-panel p-1 shadow-lg"
          >
            {RECURRENCE_OPTIONS.map((o) => (
              <DropdownMenu.Item
                key={o.value || "none"}
                onSelect={() => {
                  if (o.value === "CUSTOM") {
                    // prevent dropdown from closing immediately? we handle via state
                    setTimeout(openCustom, 0);
                  } else {
                    onChange(o.value || null);
                  }
                }}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[13px] outline-none hover:bg-cu-hover focus:bg-cu-hover"
              >
                <span className="flex-1">{o.label}</span>
                {active === o.value && <Check className="h-4 w-4 text-cu-purple" />}
              </DropdownMenu.Item>
            ))}
            {isAdvanced && (
              <DropdownMenu.Item
                onSelect={() => setTimeout(openCustom, 0)}
                className="mt-1 flex cursor-pointer items-center gap-2 rounded bg-cu-purple-light px-2 py-1.5 text-[13px] outline-none hover:bg-cu-purple-light focus:bg-cu-purple-light"
              >
                <span className="flex-1 text-cu-purple-dark">Edit custom rule...</span>
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <RecurrenceBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        rule={editingRule}
        onSave={(rule) => {
          onChange(serializeRecurrence(rule));
          setBuilderOpen(false);
        }}
        onClear={() => {
          onChange(null);
          setBuilderOpen(false);
        }}
      />
    </>
  );
}

function RecurrenceBuilderDialog({
  open,
  onOpenChange,
  rule,
  onSave,
  onClear,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rule: AdvancedRecurrenceRule;
  onSave: (r: AdvancedRecurrenceRule) => void;
  onClear: () => void;
}) {
  const [local, setLocal] = useState<AdvancedRecurrenceRule>(rule);

  // sync when rule prop changes or dialog opens
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setLocal(rule);
  }

  const setFreq = (f: RecurrenceFrequency) => {
    setLocal((r) => {
      if (f === "WEEKLY") return { ...r, frequency: f, weekdays: r.weekdays?.length ? r.weekdays : [1], monthlyMode: undefined };
      if (f === "MONTHLY") return { ...r, frequency: f, monthlyMode: r.monthlyMode ?? "dayOfMonth", nth: r.nth ?? 2, weekday: r.weekday ?? 2 };
      return { ...r, frequency: f, monthlyMode: undefined };
    });
  };

  const toggleWeekday = (wd: number) => {
    setLocal((r) => {
      const cur = r.weekdays ?? [];
      const exists = cur.includes(wd);
      const next = exists ? cur.filter((x) => x !== wd) : [...cur, wd].sort((a, b) => a - b);
      return { ...r, weekdays: next.length ? next : [wd] };
    });
  };

  const isValid =
    local.interval >= 1 &&
    (local.frequency !== "WEEKLY" || (local.weekdays && local.weekdays.length > 0)) &&
    (local.frequency !== "MONTHLY" ||
      local.monthlyMode !== "nthWeekday" ||
      (local.weekday !== undefined && local.nth !== undefined)) &&
    (local.end.type !== "after" || (local.end.count >= 1)) &&
    (local.end.type !== "until" || !!local.end.date);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[min(520px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-cu-border bg-cu-panel p-0 shadow-2xl outline-none">
          <div className="flex items-center justify-between border-b border-cu-border px-4 py-3">
            <Dialog.Title className="text-[14px] font-semibold">Custom recurrence</Dialog.Title>
            <Dialog.Close className="rounded p-1 text-cu-text-tertiary hover:bg-cu-hover">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-4 p-4">
            {/* Frequency + Interval */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
                  Frequency
                </label>
                <select
                  value={local.frequency}
                  onChange={(e) => setFreq(e.target.value as RecurrenceFrequency)}
                  className="cu-input"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
              <div className="w-[120px]">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
                  Every
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={local.interval}
                    onChange={(e) => setLocal({ ...local, interval: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="cu-input w-[70px]"
                  />
                  <span className="text-[13px] text-cu-text-tertiary">
                    {local.frequency === "DAILY" ? (local.interval === 1 ? "day" : "days") : local.frequency === "WEEKLY" ? (local.interval === 1 ? "week" : "weeks") : local.interval === 1 ? "month" : "months"}
                  </span>
                </div>
              </div>
            </div>

            {/* Weekly weekdays */}
            {local.frequency === "WEEKLY" && (
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
                  On weekdays
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAY_LABELS.map((wd) => {
                    const active = local.weekdays?.includes(wd.value);
                    return (
                      <button
                        key={wd.value}
                        type="button"
                        onClick={() => toggleWeekday(wd.value)}
                        className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                          active
                            ? "border-cu-purple bg-cu-purple text-white"
                            : "border-cu-border bg-cu-bg text-cu-text-secondary hover:bg-cu-hover"
                        }`}
                      >
                        {wd.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Monthly */}
            {local.frequency === "MONTHLY" && (
              <div className="space-y-2">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
                  Monthly mode
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLocal({ ...local, monthlyMode: "dayOfMonth" })}
                    className={`flex-1 rounded-lg border p-2 text-left text-[13px] ${
                      local.monthlyMode === "dayOfMonth" ? "border-cu-purple bg-cu-purple-light text-cu-purple-dark" : "border-cu-border hover:bg-cu-hover"
                    }`}
                  >
                    On same day each month
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocal({ ...local, monthlyMode: "nthWeekday", weekday: local.weekday ?? 2, nth: local.nth ?? 2 })}
                    className={`flex-1 rounded-lg border p-2 text-left text-[13px] ${
                      local.monthlyMode === "nthWeekday" ? "border-cu-purple bg-cu-purple-light text-cu-purple-dark" : "border-cu-border hover:bg-cu-hover"
                    }`}
                  >
                    On nth weekday
                  </button>
                </div>

                {local.monthlyMode === "nthWeekday" && (
                  <div className="flex gap-2">
                    <select
                      value={local.nth}
                      onChange={(e) => setLocal({ ...local, nth: parseInt(e.target.value) })}
                      className="cu-input flex-1"
                    >
                      {NTH_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={local.weekday}
                      onChange={(e) => setLocal({ ...local, weekday: parseInt(e.target.value) })}
                      className="cu-input flex-1"
                    >
                      {WEEKDAY_LONG.map((lbl, idx) => (
                        <option key={idx} value={idx}>
                          {lbl}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Mode */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
                Regenerate
              </label>
              <select
                value={local.mode}
                onChange={(e) => setLocal({ ...local, mode: e.target.value as RecurrenceMode })}
                className="cu-input"
              >
                <option value="on_schedule">On schedule (from due date)</option>
                <option value="on_completion">On completion (from now)</option>
              </select>
              <p className="mt-1 text-[11px] text-cu-text-tertiary">
                {local.mode === "on_schedule" ? "Next date based on previous due date." : "Next date based on completion time."}
              </p>
            </div>

            {/* End conditions */}
            <div className="space-y-2">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-cu-text-tertiary">
                Ends
              </label>
              <div className="flex gap-2">
                {(["never", "after", "until"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      let end: RecurrenceEnd;
                      if (t === "never") end = { type: "never" };
                      else if (t === "after") end = { type: "after", count: local.end.type === "after" ? local.end.count : 5 };
                      else end = { type: "until", date: local.end.type === "until" ? local.end.date : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10) };
                      setLocal({ ...local, end });
                    }}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-[12px] font-medium ${
                      local.end.type === t ? "border-cu-purple bg-cu-purple-light text-cu-purple-dark" : "border-cu-border hover:bg-cu-hover"
                    }`}
                  >
                    {t === "never" ? "Never" : t === "after" ? "After" : "On date"}
                  </button>
                ))}
              </div>

              {local.end.type === "after" && (
                <div className="flex items-center gap-2">
                  <span className="text-[13px]">After</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={local.end.count}
                    onChange={(e) => setLocal({ ...local, end: { type: "after", count: Math.max(1, parseInt(e.target.value) || 1) } })}
                    className="cu-input w-[80px]"
                  />
                  <span className="text-[13px] text-cu-text-tertiary">occurrences</span>
                </div>
              )}

              {local.end.type === "until" && (
                <input
                  type="date"
                  value={local.end.date.slice(0, 10)}
                  onChange={(e) => setLocal({ ...local, end: { type: "until", date: new Date(e.target.value).toISOString() } })}
                  className="cu-input"
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-cu-border px-4 py-3">
            <button type="button" onClick={onClear} className="rounded px-3 py-1.5 text-[13px] text-cu-text-tertiary hover:bg-cu-hover">
              Clear
            </button>
            <div className="flex gap-2">
              <Dialog.Close asChild>
                <button type="button" className="rounded px-3 py-1.5 text-[13px] text-cu-text-secondary hover:bg-cu-hover">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                disabled={!isValid}
                onClick={() => onSave(local)}
                className="rounded bg-cu-purple px-4 py-1.5 text-[13px] font-medium text-white hover:bg-cu-purple-dark disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
