import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, validateSessionToken } from "@/server/auth";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import { generateText } from "ai";
import {
  AI_NOT_CONFIGURED_MESSAGE,
  ALEX_MODEL_ID,
  getModelProvider,
  isAiConfigured,
} from "@/lib/trainer/groq";

type PlanFeedbackInput = {
  title?: string | null;
  planDate?: string | null;
  contentMd?: string | null;
};

export const Route = createFileRoute("/api/plan-feedback")({
  server: {
    handlers: {
      POST: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        const input = {
          title: (bodyObj["title"] as string) ?? null,
          planDate: (bodyObj["planDate"] as string) ?? null,
          contentMd: (bodyObj["contentMd"] as string) ?? null,
        } satisfies PlanFeedbackInput;

        const content = input.contentMd?.trim();
        if (!content) {
          return new Response(JSON.stringify({ error: "Missing contentMd" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const [profile] = await db
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, session.userId))
          .limit(1);

        if (!isAiConfigured()) {
          return new Response(JSON.stringify({ error: AI_NOT_CONFIGURED_MESSAGE }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        let provider;
        try {
          provider = getModelProvider();
        } catch (error) {
          const message = error instanceof Error ? error.message : AI_NOT_CONFIGURED_MESSAGE;
          return new Response(JSON.stringify({ error: message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const sys = `You are Alex, a certified personal trainer.
Give short, practical feedback on the user's workout plan.
Rules:
- Keep it concise (max 10 bullet points)
- Call out safety issues or imbalances first
- Suggest realistic improvements
- End with a short motivation line
Return Markdown only.`;

        const usr = `Plan title: ${input.title || "(untitled)"}
Plan date: ${input.planDate || "(n/a)"}

User profile:
- Goal: ${profile?.goal || "general fitness"}
- Level: ${profile?.level || "beginner"}
- Limitations: ${profile?.limitations || "none"}
- Age: ${profile?.age ?? "n/a"}
- Weight: ${profile?.weightKg ?? "n/a"} kg

Plan content:
${content}`;

        try {
          const { text } = await generateText({
            model: provider(ALEX_MODEL_ID),
            messages: [
              { role: "system", content: sys },
              { role: "user", content: usr },
            ],
          });
          return new Response(JSON.stringify({ ok: true, feedback: text }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          await logDevError({ error: err, req: null }).catch(() => {});
          return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
