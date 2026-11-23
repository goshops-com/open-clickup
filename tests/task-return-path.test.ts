import { describe, expect, it } from "vitest";
import { taskReturnPath } from "@/lib/task-return-path";

describe("taskReturnPath", () => {
  it("preserves the canonical task destination", () => {
    expect(taskReturnPath("/l/list-123?task=task_456")).toBe("/l/list-123?task=task_456");
  });

  it.each([null, "", "/home", "/l/list-123", "/l/list-123?task=", "/l/list-123?task=a&task=b", "https://example.invalid/l/list?task=a"])(
    "rejects destinations outside the supported format: %s",
    (value) => expect(taskReturnPath(value)).toBeNull(),
  );
});
