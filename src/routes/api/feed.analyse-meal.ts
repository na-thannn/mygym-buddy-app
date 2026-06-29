import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { readSessionCookie, validateSessionToken } from "@/server/auth";
import { db, schema } from "@/server/db";
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

export const Route = createFileRoute("/api/feed/analyse-meal")({
  server: {
    handlers: {
      POST: async (ctx: unknown) => {
        const request = getRouteRequest(ctx);
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) return json({ error: "Unauthorized" }, 401);

        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        const postId = typeof bodyObj?.postId === "string" ? bodyObj.postId.trim() : "";
        if (!postId) return json({ error: "Missing postId" }, 400);

        try {
          const [post] = await db
            .select({
              id: schema.communityFeed.id,
              userId: schema.communityFeed.userId,
              content: schema.communityFeed.content,
              imageBase64: schema.communityFeed.imageBase64,
            })
            .from(schema.communityFeed)
            .where(eq(schema.communityFeed.id, postId))
            .limit(1);
          if (!post) return json({ error: "Post not found" }, 404);
          if (post.userId !== session.userId) {
            return json({ error: "You can only analyse your own posts" }, 403);
          }

          const analysis = await analyseFeedPostMeal({
            content: post.content,
            imageBase64: post.imageBase64,
          });

          return json({
            ok: true,
            postId,
            mealName: analysis.mealName,
            macros: analysis.macros,
            suggestedBucket: analysis.suggestedBucket,
            aiConfigured: analysis.aiConfigured,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Server error";
          if (message === "This post has nothing to analyse") {
            return json({ error: message }, 400);
          }
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/feed/analyse-meal" },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});
