import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, validateSessionToken, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { and, eq, sql } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import type { MaybeWrappedRequest } from "@/types/dev";

function getRouteRequest(ctx: unknown): Request {
  const maybe = ctx as MaybeWrappedRequest;
  return (maybe.request as Request | undefined) ?? (ctx as Request);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/feed/like")({
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

        const [post] = await db
          .select({ id: schema.communityFeed.id })
          .from(schema.communityFeed)
          .where(eq(schema.communityFeed.id, postId))
          .limit(1);
        if (!post) return json({ error: "Post not found" }, 404);

        try {
          const [existing] = await db
            .select({ id: schema.feedLikes.id })
            .from(schema.feedLikes)
            .where(
              and(eq(schema.feedLikes.postId, postId), eq(schema.feedLikes.userId, session.userId)),
            )
            .limit(1);

          let liked: boolean;
          if (existing) {
            await db.delete(schema.feedLikes).where(eq(schema.feedLikes.id, existing.id));
            await db
              .update(schema.communityFeed)
              .set({
                likesCount: sql`GREATEST(${schema.communityFeed.likesCount} - 1, 0)`,
              })
              .where(eq(schema.communityFeed.id, postId));
            liked = false;
          } else {
            await db.insert(schema.feedLikes).values({
              id: newId(),
              postId,
              userId: session.userId,
            });
            await db
              .update(schema.communityFeed)
              .set({
                likesCount: sql`${schema.communityFeed.likesCount} + 1`,
              })
              .where(eq(schema.communityFeed.id, postId));
            liked = true;
          }

          const [updated] = await db
            .select({ likesCount: schema.communityFeed.likesCount })
            .from(schema.communityFeed)
            .where(eq(schema.communityFeed.id, postId))
            .limit(1);

          return json({ liked, likesCount: updated?.likesCount ?? 0 });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/feed/like", body: bodyObj },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});
