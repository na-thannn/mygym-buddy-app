import { describe, expect, it } from "vitest";
import {
  sanitizeAssistantMessage,
  stripLeakedToolSyntax,
} from "./message-sanitize";

describe("stripLeakedToolSyntax", () => {
  it("removes bracketed tool names", () => {
    expect(stripLeakedToolSyntax("[generate_workout_plan]")).toBe("");
    expect(stripLeakedToolSyntax("Working on it. [log_workout_entry]")).toBe("Working on it.");
  });

  it("removes function tags with trailing JSON payloads", () => {
    const leaked =
      'I can help. <function>log_workout_entry</function>{"dayLabel": "today", "exercise": "bench press"}';
    expect(stripLeakedToolSyntax(leaked)).toBe("I can help.");
  });

  it("removes function tags with JSON that contains closing braces in strings", () => {
    const leaked =
      'Ready. <function>log_workout_entry</function>{"notes": "set } done", "exercise": "squat"}';
    expect(stripLeakedToolSyntax(leaked)).toBe("Ready.");
  });

  it("preserves normal assistant prose", () => {
    const text = "Your plan is saved under **Plans**. Open it anytime for the full schedule.";
    expect(stripLeakedToolSyntax(text)).toBe(text);
  });
});

describe("sanitizeAssistantMessage", () => {
  it("drops empty assistant text parts after stripping leaked tool syntax", () => {
    const message = sanitizeAssistantMessage({
      id: "1",
      role: "assistant",
      parts: [{ type: "text", text: "[generate_workout_plan]" }],
    });
    expect(message.parts).toEqual([]);
  });
});
