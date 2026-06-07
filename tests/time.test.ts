import { describe, it, expect } from "vitest";
import { formatDuration, formatClock, parseDuration } from "@/lib/time";

describe("formatDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatDuration(9000)).toBe("2h 30m");
    expect(formatDuration(3600)).toBe("1h");
    expect(formatDuration(2700)).toBe("45m");
    expect(formatDuration(0)).toBe("0m");
  });
  it("shows seconds only when under a minute", () => {
    expect(formatDuration(30)).toBe("30s");
    expect(formatDuration(90)).toBe("1m");
  });
});

describe("formatClock", () => {
  it("formats mm:ss under an hour", () => {
    expect(formatClock(125)).toBe("2:05");
    expect(formatClock(59)).toBe("0:59");
  });
  it("formats h:mm:ss over an hour", () => {
    expect(formatClock(3725)).toBe("1:02:05");
  });
});

describe("parseDuration", () => {
  it("parses combined units", () => {
    expect(parseDuration("1h 30m")).toBe(5400);
    expect(parseDuration("2h")).toBe(7200);
    expect(parseDuration("45m")).toBe(2700);
  });
  it("treats a bare number as minutes", () => {
    expect(parseDuration("90")).toBe(5400);
  });
  it("parses decimal hours", () => {
    expect(parseDuration("1.5h")).toBe(5400);
  });
  it("parses clock form h:mm", () => {
    expect(parseDuration("1:30")).toBe(5400);
  });
  it("parses seconds", () => {
    expect(parseDuration("30s")).toBe(30);
  });
  it("returns null for junk", () => {
    expect(parseDuration("")).toBeNull();
    expect(parseDuration("abc")).toBeNull();
  });
});
