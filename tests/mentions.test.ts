import { describe, it, expect } from "vitest";
import { extractMentionIds } from "@/lib/mentions";

describe("extractMentionIds", () => {
  it("extracts a single mention id", () => {
    const html = '<p>hey <span class="mention" data-id="u1" data-type="mention">@Maya</span></p>';
    expect(extractMentionIds(html)).toEqual(["u1"]);
  });

  it("extracts multiple mentions", () => {
    const html =
      '<p><span class="mention" data-id="u1">@A</span> and <span class="mention" data-id="u2">@B</span></p>';
    expect(extractMentionIds(html)).toEqual(["u1", "u2"]);
  });

  it("dedupes repeated mentions of the same user", () => {
    const html =
      '<span class="mention" data-id="u1">@A</span><span class="mention" data-id="u1">@A</span>';
    expect(extractMentionIds(html)).toEqual(["u1"]);
  });

  it("ignores non-mention spans", () => {
    const html = '<span class="highlight" data-id="x1">not a mention</span>';
    expect(extractMentionIds(html)).toEqual([]);
  });

  it("returns empty for plain text / no mentions", () => {
    expect(extractMentionIds("<p>just a comment</p>")).toEqual([]);
    expect(extractMentionIds("")).toEqual([]);
  });

  it("handles attribute order variations", () => {
    const html = '<span data-id="u9" data-type="mention" class="mention">@Z</span>';
    expect(extractMentionIds(html)).toEqual(["u9"]);
  });
});
