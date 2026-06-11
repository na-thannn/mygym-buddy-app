import { describe, expect, it } from "vitest";
import { buildAlexSystemPrompt } from "./prompts";

describe("Alex system prompt", () => {
  it("combines coaching rules, safety boundaries, date, tools, and member context", () => {
    const prompt = buildAlexSystemPrompt({
      today: "2026-06-04",
      contextText:
        "Member context:\n- Goal: Build strength\n- Limitations: Previous shoulder irritation",
    });

    expect(prompt).toContain("certified personal trainer chatbot");
    expect(prompt).toContain("today is 2026-06-04");
    expect(prompt).toContain("Ask the user one focused question at a time");
    expect(prompt).toContain("do not diagnose");
    expect(prompt).toContain("create_support_ticket");
    expect(prompt).toContain("Build strength");
    expect(prompt).toContain("Previous shoulder irritation");
  });

  it("requires DB-backed prices and terms for package sales answers", () => {
    const prompt = buildAlexSystemPrompt({
      today: "2026-06-08",
      contextText: "Member context:\n- Public plans and DB-backed prices:\n  - Standard: 200,000 VND",
    });

    expect(prompt).toContain("quote only prices and terms present in the member context");
    expect(prompt).toContain("do not have a DB-backed price");
    expect(prompt).toContain("Never invent HL Fitness prices");
    expect(prompt).toContain("social links");
  });
});
