import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, validateSessionToken } from "@/server/auth";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import { analyseFeedPostMeal } from "@/lib/feed-meal-analysis";
import type { MaybeWrappedRequest } from "@/types/dev";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getRouteRequest(ctx: unknown): Request {
  const maybe = ctx as MaybeWrappedRequest;
  return (maybe.request as Request | undefined) ?? (ctx as Request);
}

export const Route = createFileRoute("/api/nutrition/analyse-meal")({
  server: {
    handlers: {
      POST: async (ctx: unknown) => {
        const request = getRouteRequest(ctx);
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) return json({ error: "Unauthorized" }, 401);

        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        const imageBase64 =
          typeof bodyObj?.imageBase64 === "string" ? bodyObj.imageBase64.trim() : "";
        const note = typeof bodyObj?.note === "string" ? bodyObj.note.trim() : "";
        if (!imageBase64 && !note) {
          return json({ error: "Add a photo or meal description" }, 400);
        }

        try {
          const analysis = await analyseFeedPostMeal({
            content: note || null,
            imageBase64: imageBase64 || null,
          });

          return json({
            ok: true,
            mealName: analysis.mealName,
            macros: analysis.macros,
            suggestedBucket: analysis.suggestedBucket,
            aiConfigured: analysis.aiConfigured,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Server error";
          if (message === "This post has nothing to analyse") {
            return json({ error: "Add a photo or meal description" }, 400);
          }
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/nutrition/analyse-meal" },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});
