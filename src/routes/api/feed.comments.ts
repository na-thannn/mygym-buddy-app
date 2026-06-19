import { createFileRoute } from "@tanstack/react-router";
import { desc, eq } from "drizzle-orm";
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

export const Route = createFileRoute("/api/feed/comments")({
  server: {
    handlers: {
      GET: async () => {
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) return new Response(null, { status: 204 });
        const rows = await db
          .select({
            id: schema.feedComments.id,
            postId: schema.feedComments.postId,
            userId: schema.feedComments.userId,
            content: schema.feedComments.content,
            isAgent: schema.feedComments.isAgent,
            macrosJson: schema.feedComments.macrosJson,
            createdAt: schema.feedComments.createdAt,
            authorName: schema.users.displayName,
          })
          .from(schema.feedComments)
          .leftJoin(schema.users, eq(schema.feedComments.userId, schema.users.id))
          .orderBy(desc(schema.feedComments.createdAt))
          .limit(300);
        return json(rows);
      },
      POST: async (ctx: unknown) => {
        const request = getRouteRequest(ctx);
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) return json({ error: "Unauthorized" }, 401);

        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        const postId = typeof bodyObj?.postId === "string" ? bodyObj.postId.trim() : "";
        const content = typeof bodyObj?.content === "string" ? bodyObj.content.trim() : "";
        if (!postId || !content) return json({ error: "Missing postId or content" }, 400);
        if (content.length > 2000) return json({ error: "Comment is too long" }, 400);

        try {
          const [post] = await db
            .select({ id: schema.communityFeed.id })
            .from(schema.communityFeed)
            .where(eq(schema.communityFeed.id, postId))
            .limit(1);
          if (!post) return json({ error: "Post not found" }, 404);

          const id = newId();
          const createdAt = new Date().toISOString();
          await db.insert(schema.feedComments).values({
            id,
            postId,
            userId: session.userId,
            content,
            isAgent: 0,
            createdAt,
          });
          return json({
            ok: true,
            comment: {
              id,
              postId,
              userId: session.userId,
              content,
              isAgent: 0,
              macrosJson: null,
              createdAt,
              authorName: session.displayName,
            },
          });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/feed/comments" },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});
