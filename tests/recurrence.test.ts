import { describe, it, expect } from "vitest";
import { nextOccurrence, recurrenceLabel } from "@/lib/recurrence";

describe("nextOccurrence", () => {
  it("advances daily", () => {
    expect(nextOccurrence(new Date("2026-06-10T12:00:00"), "DAILY").toISOString().slice(0, 10)).toBe("2026-06-11");
  });
  it("advances weekly", () => {
    expect(nextOccurrence(new Date("2026-06-10T12:00:00"), "WEEKLY").toISOString().slice(0, 10)).toBe("2026-06-17");
  });
  it("advances biweekly", () => {
    expect(nextOccurrence(new Date("2026-06-10T12:00:00"), "BIWEEKLY").toISOString().slice(0, 10)).toBe("2026-06-24");
  });
  it("advances monthly", () => {
    expect(nextOccurrence(new Date("2026-06-10T12:00:00"), "MONTHLY").toISOString().slice(0, 10)).toBe("2026-07-10");
  });
  it("skips the weekend for WEEKDAYS (Fri -> Mon)", () => {
    // 2026-06-12 is a Friday
    expect(nextOccurrence(new Date("2026-06-12T12:00:00"), "WEEKDAYS").toISOString().slice(0, 10)).toBe("2026-06-15");
  });
  it("WEEKDAYS on a weekday goes to next day", () => {
    // 2026-06-10 is a Wednesday
    expect(nextOccurrence(new Date("2026-06-10T12:00:00"), "WEEKDAYS").toISOString().slice(0, 10)).toBe("2026-06-11");
  });
});

describe("recurrenceLabel", () => {
  it("maps known rules", () => {
    expect(recurrenceLabel("WEEKLY")).toBe("Weekly");
    expect(recurrenceLabel("WEEKDAYS")).toBe("Every weekday");
  });
  it("falls back for null/unknown", () => {
    expect(recurrenceLabel(null)).toBe("Doesn't repeat");
    expect(recurrenceLabel("ZZZ")).toBe("Doesn't repeat");
  });
});
