import { describe, expect, it } from "vitest";
import { sanitizeMarkdownFilename } from "./download-markdown";

describe("sanitizeMarkdownFilename", () => {
  it("removes unsafe path characters", () => {
    expect(sanitizeMarkdownFilename("Push/Legs: Week 1")).toBe("Push-Legs- Week 1");
  });

  it("falls back when empty", () => {
    expect(sanitizeMarkdownFilename("///")).toBe("plan");
  });
});
