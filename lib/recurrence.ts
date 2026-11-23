import {
  addDays,
  addWeeks,
  addMonths,
  isWeekend,
  startOfWeek,
  differenceInCalendarWeeks,
  getDaysInMonth,
} from "date-fns";

export const RECURRENCE_OPTIONS = [
  { value: "", label: "Doesn't repeat" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKDAYS", label: "Every weekday" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Every 2 weeks" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom..." },
] as const;

export type Recurrence = "DAILY" | "WEEKDAYS" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

// ---------------------------------------------------------------------------
// Advanced types
// ---------------------------------------------------------------------------

export type RecurrenceMode = "on_schedule" | "on_completion";

export type RecurrenceEnd =
  | { type: "never" }
  | { type: "after"; count: number }
  | { type: "until"; date: string }; // ISO string

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY";

export interface AdvancedRecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // >=1
  // WEEKLY
  weekdays?: number[]; // 0 Sun .. 6 Sat
  // MONTHLY
  monthlyMode?: "dayOfMonth" | "nthWeekday";
  nth?: number; // 1..5 or -1 for last
  weekday?: number; // 0..6 for nth weekday
  mode: RecurrenceMode;
  end: RecurrenceEnd;
  occurrence?: number; // 1-based, default 1
}

export type ParsedRecurrence =
  | { kind: "none" }
  | { kind: "legacy"; rule: Recurrence }
  | { kind: "advanced"; rule: AdvancedRecurrenceRule };

const LEGACY_SET = new Set<string>(["DAILY", "WEEKDAYS", "WEEKLY", "BIWEEKLY", "MONTHLY"]);

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const NTH_LABEL: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
  [-1 as number]: "last",
};

function normalizeWeekdays(wds?: number[]): number[] {
  if (!wds || wds.length === 0) return [];
  const uniq = Array.from(new Set(wds.map((n) => ((n % 7) + 7) % 7)));
  return uniq.sort((a, b) => a - b);
}

function isValidAdvancedRule(o: any): o is AdvancedRecurrenceRule {
  if (!o || typeof o !== "object") return false;
  if (!["DAILY", "WEEKLY", "MONTHLY"].includes(o.frequency)) return false;
  if (typeof o.interval !== "number" || o.interval < 1) return false;
  if (!["on_schedule", "on_completion"].includes(o.mode)) return false;
  if (!o.end || typeof o.end.type !== "string") return false;
  if (o.end.type === "after") {
    if (typeof o.end.count !== "number" || o.end.count < 1) return false;
  }
  if (o.end.type === "until") {
    if (typeof o.end.date !== "string" || isNaN(Date.parse(o.end.date))) return false;
  }
  if (o.frequency === "WEEKLY") {
    if (!Array.isArray(o.weekdays) || o.weekdays.length === 0) return false;
  }
  if (o.frequency === "MONTHLY" && o.monthlyMode === "nthWeekday") {
    if (typeof o.weekday !== "number" || o.weekday < 0 || o.weekday > 6) return false;
    if (typeof o.nth !== "number" || ![1, 2, 3, 4, 5, -1].includes(o.nth)) return false;
  }
  return true;
}

export function parseRecurrence(raw: string | null | undefined): ParsedRecurrence {
  if (!raw) return { kind: "none" };
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "none" };
  if (LEGACY_SET.has(trimmed)) {
    return { kind: "legacy", rule: trimmed as Recurrence };
  }
  // Try JSON
  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed);
      if (isValidAdvancedRule(obj)) {
        // normalize
        const rule: AdvancedRecurrenceRule = {
          frequency: obj.frequency,
          interval: Math.max(1, Math.floor(obj.interval)),
          weekdays: obj.weekdays ? normalizeWeekdays(obj.weekdays) : undefined,
          monthlyMode: obj.monthlyMode,
          nth: obj.nth,
          weekday: obj.weekday,
          mode: obj.mode,
          end: obj.end,
          occurrence: obj.occurrence && obj.occurrence >= 1 ? Math.floor(obj.occurrence) : 1,
        };
        // default monthlyMode for MONTHLY if not set
        if (rule.frequency === "MONTHLY" && !rule.monthlyMode) {
          rule.monthlyMode = rule.nth !== undefined ? "nthWeekday" : "dayOfMonth";
        }
        return { kind: "advanced", rule };
      }
    } catch {
      // fall through
    }
  }
  return { kind: "none" };
}

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

export function formatWeekdaysShort(wds: number[]): string {
  return wds.map((d) => WEEKDAY_SHORT[d]).join(", ");
}

function formatNth(nth: number): string {
  return NTH_LABEL[nth] ?? `${nth}th`;
}

function formatEnd(end: RecurrenceEnd): string {
  if (end.type === "after") {
    return `, ${end.count} ${end.count === 1 ? "time" : "times"}`;
  }
  if (end.type === "until") {
    try {
      const d = new Date(end.date);
      return `, until ${d.toLocaleDateString()}`;
    } catch {
      return "";
    }
  }
  return "";
}

function advancedLabel(rule: AdvancedRecurrenceRule): string {
  const interval = rule.interval;
  let base = "";
  if (rule.frequency === "DAILY") {
    base = interval === 1 ? "Daily" : `Every ${interval} days`;
  } else if (rule.frequency === "WEEKLY") {
    const wds = normalizeWeekdays(rule.weekdays);
    const wdStr = wds.length ? ` on ${formatWeekdaysShort(wds)}` : "";
    if (interval === 1) base = `Weekly${wdStr}`;
    else base = `Every ${interval} weeks${wdStr}`;
  } else if (rule.frequency === "MONTHLY") {
    if (rule.monthlyMode === "nthWeekday" && rule.weekday !== undefined && rule.nth !== undefined) {
      const nthStr = formatNth(rule.nth);
      const wdStr = WEEKDAY_LONG[rule.weekday];
      if (interval === 1) base = `Monthly on the ${nthStr} ${wdStr}`;
      else base = `Every ${interval} months on the ${nthStr} ${wdStr}`;
    } else {
      if (interval === 1) base = "Monthly";
      else base = `Every ${interval} months`;
    }
  }
  const endStr = formatEnd(rule.end);
  return `${base}${endStr}`;
}

export function recurrenceLabel(ruleStr: string | null | undefined): string {
  if (!ruleStr) return "Doesn't repeat";
  const trimmed = ruleStr.trim();
  if (!trimmed) return "Doesn't repeat";
  const found = RECURRENCE_OPTIONS.find((o) => o.value === trimmed);
  if (found && found.value !== "CUSTOM") return found.label;
  const parsed = parseRecurrence(trimmed);
  if (parsed.kind === "legacy") {
    return RECURRENCE_OPTIONS.find((o) => o.value === parsed.rule)?.label ?? parsed.rule;
  }
  if (parsed.kind === "advanced") {
    return advancedLabel(parsed.rule);
  }
  return "Doesn't repeat";
}

// ---------------------------------------------------------------------------
// Legacy nextOccurrence
// ---------------------------------------------------------------------------

/** Advance a date by one recurrence step. WEEKDAYS skips Sat/Sun. */
export function nextOccurrence(from: Date, rule: Recurrence): Date {
  switch (rule) {
    case "DAILY":
      return addDays(from, 1);
    case "WEEKLY":
      return addWeeks(from, 1);
    case "BIWEEKLY":
      return addWeeks(from, 2);
    case "MONTHLY":
      return addMonths(from, 1);
    case "WEEKDAYS": {
      let d = addDays(from, 1);
      while (isWeekend(d)) d = addDays(d, 1);
      return d;
    }
  }
}

// ---------------------------------------------------------------------------
// Advanced helpers
// ---------------------------------------------------------------------------

/** Return the nth weekday of a given month, or null if it doesn't exist. */
export function getNthWeekdayOfMonth(
  year: number,
  month: number, // 0-based
  weekday: number, // 0 Sun..6 Sat
  nth: number, // 1..5 or -1 last
  referenceTime?: Date, // to copy time from
): Date | null {
  if (nth === -1) {
    // last occurrence
    const lastDay = new Date(year, month + 1, 0);
    const lastWeekday = lastDay.getDay();
    const offset = (lastWeekday - weekday + 7) % 7;
    const day = lastDay.getDate() - offset;
    const d = new Date(year, month, day);
    if (referenceTime) {
      d.setHours(
        referenceTime.getHours(),
        referenceTime.getMinutes(),
        referenceTime.getSeconds(),
        referenceTime.getMilliseconds(),
      );
    }
    return d;
  }
  // nth 1..5
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  const firstOcc = 1 + offset;
  const nthDay = firstOcc + (nth - 1) * 7;
  if (nthDay > getDaysInMonth(new Date(year, month, 1))) return null;
  const d = new Date(year, month, nthDay);
  if (referenceTime) {
    d.setHours(
      referenceTime.getHours(),
      referenceTime.getMinutes(),
      referenceTime.getSeconds(),
      referenceTime.getMilliseconds(),
    );
  }
  return d;
}

/** Find next weekly occurrence after `from`, respecting interval and weekdays. */
export function getNextWeeklyOccurrence(from: Date, interval: number, weekdays: number[]): Date | null {
  const wds = normalizeWeekdays(weekdays);
  if (wds.length === 0) return null;
  // Search forward up to ~ 2 years to be safe
  const maxSearch = Math.max(500, interval * 7 * 10);
  for (let offset = 1; offset <= maxSearch; offset++) {
    const candidate = addDays(from, offset);
    const wd = candidate.getDay();
    if (!wds.includes(wd)) continue;
    const weekDiff = differenceInCalendarWeeks(candidate, from, { weekStartsOn: 1 });
    if (weekDiff % interval !== 0) continue;
    return candidate;
  }
  return null;
}

/** Find next monthly nth-weekday occurrence after `from`. */
export function getNextMonthlyNthWeekdayAfter(
  from: Date,
  interval: number,
  weekday: number,
  nth: number,
): Date | null {
  // Start scanning from current month; if candidate <= from, go to next interval month(s)
  let year = from.getFullYear();
  let month = from.getMonth();
  // We will try up to 200 months ahead (≈16 years)
  for (let attempt = 0; attempt < 200; attempt++) {
    const candidate = getNthWeekdayOfMonth(year, month, weekday, nth, from);
    if (candidate && candidate.getTime() > from.getTime()) {
      // Also need to respect interval from original from?
      // We compute months difference from original from month
      const monthsDiff =
        (year - from.getFullYear()) * 12 + (month - from.getMonth());
      // If this is the same month as from and candidate > from, monthsDiff=0 should be allowed only if attempt==0
      // But for interval enforcement, we require monthsDiff % interval ===0
      // However for first candidate in same month, monthsDiff 0 % interval ==0 passes
      // For spawn case where from is occurrence itself, same month candidate equals from? No, candidate==from? Actually if from is exactly nth weekday, candidate == from, not >, so we skip.
      // So monthsDiff=0 case will be skipped for spawn, good.
      // For interval >1, same month candidate > from should be allowed only once at start; subsequent require interval.
      if (monthsDiff % interval === 0) {
        return candidate;
      }
    }
    // advance by 1 month if attempt==0 and we haven't found in current month? Actually we need to advance by interval logic:
    // Simpler: advance month by 1, but then check monthsDiff % interval.
    // To avoid skipping, we increment month by 1 each loop and filter by monthsDiff % interval.
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return null;
}

/** Compute next occurrence for advanced rule, given a base date `from`. Returns null if none. */
export function getNextAdvancedOccurrence(from: Date, rule: AdvancedRecurrenceRule): Date | null {
  const interval = Math.max(1, rule.interval);
  if (rule.frequency === "DAILY") {
    return addDays(from, interval);
  }
  if (rule.frequency === "WEEKLY") {
    return getNextWeeklyOccurrence(from, interval, rule.weekdays ?? []);
  }
  if (rule.frequency === "MONTHLY") {
    if (rule.monthlyMode === "nthWeekday" && rule.weekday !== undefined && rule.nth !== undefined) {
      return getNextMonthlyNthWeekdayAfter(from, interval, rule.weekday, rule.nth);
    }
    // dayOfMonth
    return addMonths(from, interval);
  }
  return null;
}

/** Whether spawning should stop based on end conditions and current occurrence count. */
export function shouldStopRecurrence(rule: AdvancedRecurrenceRule, nextDate: Date | null): boolean {
  const occ = rule.occurrence ?? 1;
  if (rule.end.type === "after") {
    if (occ >= rule.end.count) return true;
    // additionally, if nextDate would be beyond count? Already handled by occ check
  }
  if (rule.end.type === "until" && nextDate) {
    const until = new Date(rule.end.date);
    if (nextDate.getTime() > until.getTime()) return true;
  }
  return false;
}

/** Serialize advanced rule to string for storage. */
export function serializeRecurrence(rule: AdvancedRecurrenceRule): string {
  return JSON.stringify(rule);
}

/** Create a default advanced rule for UI initial state. */
export function defaultAdvancedRule(): AdvancedRecurrenceRule {
  return {
    frequency: "WEEKLY",
    interval: 1,
    weekdays: [1], // Monday
    mode: "on_schedule",
    end: { type: "never" },
    occurrence: 1,
    monthlyMode: "dayOfMonth",
  };
}
