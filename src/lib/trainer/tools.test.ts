import type { UIMessage } from "ai";
import { validateUIMessages } from "ai";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import { buildAlexTools } from "./tools";

type ValidateTools = NonNullable<Parameters<typeof validateUIMessages>[0]["tools"]>;

describe("Alex trainer tools", () => {
  it("accepts workout-plan goal and level details supplied during chat", async () => {
    const tools = buildAlexTools({ userId: "user-1", role: "customer" });
    const schemaKeys = (
      tools.generate_workout_plan.inputSchema as z.ZodObject<z.ZodRawShape>
    ).keyof().options;

    expect(schemaKeys).toContain("goal");
    expect(schemaKeys).toContain("level");

    const messages: UIMessage[] = [
      {
        id: "assistant-tool-call",
        role: "assistant",
        parts: [
          {
            type: "tool-generate_workout_plan",
            toolCallId: "call-1",
            state: "input-available",
            input: {
              planDate: "2026-06-04",
              daysPerWeek: "4 days",
              goal: "build muscle",
              level: "3 years training experience",
            },
          },
        ],
      },
    ];

    await expect(
      validateUIMessages({ messages, tools: tools as unknown as ValidateTools }),
    ).resolves.toEqual(messages);
  });

  it("exposes DB-backed gym knowledge and customer action tools", () => {
    const tools = buildAlexTools({ userId: "user-1", role: "customer" });

    expect(Object.keys(tools)).toEqual(
      expect.arrayContaining([
        "get_gym_knowledge",
        "create_package_request",
        "request_pt_session",
        "book_group_class",
        "cancel_group_class_booking",
      ]),
    );
  });
});
