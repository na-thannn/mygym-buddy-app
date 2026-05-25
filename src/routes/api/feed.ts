import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, validateSessionToken, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { eq, desc } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import type { MaybeWrappedRequest } from "@/types/dev";

export const Route = createFileRoute("/api/feed")({
  server: {
    handlers: {
      GET: async () => {
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session) return new Response(null, { status: 204 });
        const rows = db
          .select({
            id: schema.communityFeed.id,
            content: schema.communityFeed.content,
            imageBase64: schema.communityFeed.imageBase64,
            likesCount: schema.communityFeed.likesCount,
            createdAt: schema.communityFeed.createdAt,
            authorName: schema.users.displayName,
          })
          .from(schema.communityFeed)
          .leftJoin(schema.users, eq(schema.communityFeed.userId, schema.users.id))
          .orderBy(desc(schema.communityFeed.createdAt))
          .limit(50)
          .all();
        return new Response(JSON.stringify(rows), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      POST: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session)
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        if (!bodyObj || !(bodyObj["content"] || bodyObj["imageBase64"]))
          return new Response(JSON.stringify({ error: "Missing content or imageBase64" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (db as any)
            .insert(schema.communityFeed)
            .values({
              id,
              userId: session.userId,
              content,
              imageBase64,
              createdAt,
            })
            .run();
          return new Response(JSON.stringify({ ok: true, id }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/feed", body: bodyObj },
          }).catch(() => {});
          return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
