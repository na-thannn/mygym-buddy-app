import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, validateSessionToken, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
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

export const Route = createFileRoute("/api/feed")({
  server: {
    handlers: {
      GET: async () => {
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) return new Response(null, { status: 204 });
        const rows = await db
          .select({
            id: schema.communityFeed.id,
            userId: schema.communityFeed.userId,
            content: schema.communityFeed.content,
            imageBase64: schema.communityFeed.imageBase64,
            likesCount: schema.communityFeed.likesCount,
            createdAt: schema.communityFeed.createdAt,
            authorName: schema.users.displayName,
          })
          .from(schema.communityFeed)
          .leftJoin(schema.users, eq(schema.communityFeed.userId, schema.users.id))
          .orderBy(desc(schema.communityFeed.createdAt))
          .limit(50);

        const postIds = rows.map((row) => row.id);
        const likedSet = new Set<string>();
        if (postIds.length > 0) {
          const likes = await db
            .select({ postId: schema.feedLikes.postId })
            .from(schema.feedLikes)
            .where(
              and(
                eq(schema.feedLikes.userId, session.userId),
                inArray(schema.feedLikes.postId, postIds),
              ),
            );
          for (const like of likes) likedSet.add(like.postId);
        }

        const enriched = rows.map((row) => ({
          ...row,
          likedByMe: likedSet.has(row.id),
        }));

        return json(enriched);
      },
      POST: async (ctx: unknown) => {
        const request = getRouteRequest(ctx);
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) return json({ error: "Unauthorized" }, 401);
        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        if (!bodyObj || !(bodyObj["content"] || bodyObj["imageBase64"]))
          return json({ error: "Missing content or imageBase64" }, 400);
        const id = newId();
        try {
          const content =
            typeof bodyObj?.content === "string"
              ? (bodyObj.content as string)
              : String(bodyObj?.content ?? "");
          const imageBase64 =
            typeof bodyObj?.imageBase64 === "string" ? (bodyObj.imageBase64 as string) : undefined;
          const createdAt = bodyObj?.createdAt
            ? String(bodyObj.createdAt)
            : new Date().toISOString();
          await db.insert(schema.communityFeed).values({
            id,
            userId: session.userId,
            content,
            imageBase64,
            createdAt,
          });
          return json({ ok: true, id });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/feed", body: bodyObj },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
      PATCH: async (ctx: unknown) => {
        const request = getRouteRequest(ctx);
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) return json({ error: "Unauthorized" }, 401);

        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        const id = typeof bodyObj?.id === "string" ? bodyObj.id.trim() : "";
        if (!id) return json({ error: "Missing id" }, 400);

        const [post] = await db
          .select()
          .from(schema.communityFeed)
          .where(eq(schema.communityFeed.id, id))
          .limit(1);
        if (!post) return json({ error: "Not found" }, 404);
        if (post.userId !== session.userId) return json({ error: "Forbidden" }, 403);

        const content =
          bodyObj?.content !== undefined
            ? typeof bodyObj.content === "string"
              ? bodyObj.content
              : String(bodyObj.content)
            : post.content;
        const imageBase64 =
          bodyObj?.imageBase64 !== undefined
            ? typeof bodyObj.imageBase64 === "string"
              ? bodyObj.imageBase64
              : null
            : post.imageBase64;

        if (!content && !imageBase64) return json({ error: "Post must have text or image" }, 400);

        try {
          await db
            .update(schema.communityFeed)
            .set({ content, imageBase64 })
            .where(eq(schema.communityFeed.id, id));
          return json({ ok: true, id });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "PATCH", url: "/api/feed", body: bodyObj },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
      DELETE: async (ctx: unknown) => {
        const request = getRouteRequest(ctx);
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) return json({ error: "Unauthorized" }, 401);

        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        const id = typeof bodyObj?.id === "string" ? bodyObj.id.trim() : "";
        if (!id) return json({ error: "Missing id" }, 400);

        const [post] = await db
          .select({ userId: schema.communityFeed.userId })
          .from(schema.communityFeed)
          .where(eq(schema.communityFeed.id, id))
          .limit(1);
        if (!post) return json({ error: "Not found" }, 404);
        if (post.userId !== session.userId) return json({ error: "Forbidden" }, 403);

        try {
          await db.delete(schema.communityFeed).where(eq(schema.communityFeed.id, id));
          return json({ ok: true });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "DELETE", url: "/api/feed", body: bodyObj },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});
