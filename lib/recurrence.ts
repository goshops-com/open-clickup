import { addDays, addWeeks, addMonths, isWeekend } from "date-fns";

export const RECURRENCE_OPTIONS = [
  { value: "", label: "Doesn't repeat" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKDAYS", label: "Every weekday" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Every 2 weeks" },
  { value: "MONTHLY", label: "Monthly" },
] as const;

export type Recurrence = "DAILY" | "WEEKDAYS" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";

export function recurrenceLabel(rule: string | null | undefined): string {
  return RECURRENCE_OPTIONS.find((o) => o.value === rule)?.label ?? "Doesn't repeat";
}

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
