import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { readSessionCookie, validateSessionToken, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
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

export const Route = createFileRoute("/api/feed/confirm-meal-log")({
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
        const mealName =
          typeof bodyObj?.mealName === "string" ? bodyObj.mealName.trim().slice(0, 120) : "Meal";
        if (!postId) return json({ error: "Missing postId" }, 400);

        const macrosObj =
          bodyObj?.macros && typeof bodyObj.macros === "object"
            ? (bodyObj.macros as Record<string, unknown>)
            : null;

        try {
          const [post] = await db
            .select({ userId: schema.communityFeed.userId })
            .from(schema.communityFeed)
            .where(eq(schema.communityFeed.id, postId))
            .limit(1);
          if (!post) return json({ error: "Post not found" }, 404);
          if (post.userId !== session.userId) return json({ error: "Forbidden" }, 403);

          const macros = macrosObj
            ? {
                calories: Number(macrosObj.calories) || 0,
                proteinG: Number(macrosObj.proteinG) || 0,
                carbsG: Number(macrosObj.carbsG) || 0,
                fatsG: Number(macrosObj.fatsG) || 0,
              }
            : null;

          const summary = macros
            ? `Logged "${mealName}" to your nutrition: about ${Math.round(macros.calories)} kcal, ${Math.round(macros.proteinG)}g protein, ${Math.round(macros.carbsG)}g carbs, ${Math.round(macros.fatsG)}g fat.`
            : `Logged "${mealName}" to your nutrition log.`;

          const commentId = newId();
          const createdAt = new Date().toISOString();
          await db.insert(schema.feedComments).values({
            id: commentId,
            postId,
            userId: session.userId,
            content: summary,
            isAgent: 1,
            macrosJson: macros ? JSON.stringify(macros) : null,
            createdAt,
          });

          return json({
            ok: true,
            comment: {
              id: commentId,
              postId,
              userId: session.userId,
              content: summary,
              isAgent: 1,
              macrosJson: macros ? JSON.stringify(macros) : null,
              createdAt,
              authorName: "Alex",
            },
          });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/feed/confirm-meal-log" },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});
