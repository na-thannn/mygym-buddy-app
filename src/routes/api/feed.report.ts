import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, validateSessionToken, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";
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

export const Route = createFileRoute("/api/feed/report")({
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

        const reason =
          typeof bodyObj?.reason === "string" ? bodyObj.reason.trim().slice(0, 500) : "";

        const [post] = await db
          .select({
            id: schema.communityFeed.id,
            userId: schema.communityFeed.userId,
            content: schema.communityFeed.content,
            authorName: schema.users.displayName,
          })
          .from(schema.communityFeed)
          .leftJoin(schema.users, eq(schema.communityFeed.userId, schema.users.id))
          .where(eq(schema.communityFeed.id, postId))
          .limit(1);

        if (!post) return json({ error: "Post not found" }, 404);
        if (post.userId === session.userId)
          return json({ error: "You cannot report your own post" }, 400);

        const excerpt = (post.content ?? "").slice(0, 200);
        const message = [
          `Reported feed post: ${postId}`,
          `Author: ${post.authorName ?? post.userId}`,
          excerpt ? `Excerpt: ${excerpt}` : "",
          reason ? `Reason: ${reason}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        try {
          const id = newId();
          await db.insert(schema.supportTickets).values({
            id,
            customerId: session.userId,
            subject: "Feed post report",
            message,
            source: "feed_report",
          });
          return json({ ok: true, id }, 201);
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/feed/report", body: bodyObj },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});
