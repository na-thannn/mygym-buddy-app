import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, validateSessionToken } from "@/server/auth";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import type { MaybeWrappedRequest } from "@/types/dev";

export const Route = createFileRoute("/api/profile")({
  server: {
    handlers: {
      GET: async () => {
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) return new Response(null, { status: 204 });
        const [row] = await db
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, session.userId))
          .limit(1);
        return new Response(JSON.stringify(row ?? null), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      POST: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session)
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        const [existing] = await db
          .select({ userId: schema.profiles.userId })
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, session.userId))
          .limit(1);
        const patch = {
          ...(bodyObj as Record<string, unknown>),
          updatedAt: new Date().toISOString(),
        };
        try {
          if (existing) {
            await db
              .update(schema.profiles)
              .set(patch)
              .where(eq(schema.profiles.userId, session.userId));
          } else {
            await db.insert(schema.profiles).values({ userId: session.userId, ...patch });
          }
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/profile", body: patch },
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
