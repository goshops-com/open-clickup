import { describe, it, expect } from "vitest";
import { initials, midpoint, colorFromString } from "@/lib/utils";

describe("initials", () => {
  it("uses first + last initials for multi-word names", () => {
    expect(initials("Santiago Cotto")).toBe("SC");
    expect(initials("Maya Q Chen")).toBe("MC");
  });
  it("uses first two letters for single-word names", () => {
    expect(initials("Diego")).toBe("DI");
  });
});

describe("midpoint (fractional indexing)", () => {
  it("returns a value strictly between two positions", () => {
    const m = midpoint(0, 1000);
    expect(m).toBeGreaterThan(0);
    expect(m).toBeLessThan(1000);
    expect(m).toBe(500);
  });
  it("handles open ends", () => {
    expect(midpoint(null, 1000)).toBeLessThan(1000);
    expect(midpoint(1000, null)).toBeGreaterThan(1000);
    expect(midpoint(null, null)).toBe(1000);
  });
});

describe("colorFromString", () => {
  it("is deterministic", () => {
    expect(colorFromString("santiago")).toBe(colorFromString("santiago"));
  });
  it("returns a hex color", () => {
    expect(colorFromString("x")).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
