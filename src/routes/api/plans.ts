import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, validateSessionToken, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { eq, desc } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import type { MaybeWrappedRequest } from "@/types/dev";

export const Route = createFileRoute("/api/plans")({
  server: {
    handlers: {
      GET: async () => {
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) return new Response(null, { status: 204 });
        const rows = await db
          .select()
          .from(schema.workoutPlanDocs)
          .where(eq(schema.workoutPlanDocs.userId, session.userId))
          .orderBy(desc(schema.workoutPlanDocs.planDate), desc(schema.workoutPlanDocs.createdAt))
          .limit(100);
        return new Response(JSON.stringify(rows), {
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
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        if (!bodyObj || !bodyObj["planDate"])
          return new Response(JSON.stringify({ error: "Missing planDate" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        if (!bodyObj["contentMd"])
          return new Response(JSON.stringify({ error: "Missing contentMd" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        const id = newId();
        try {
          await db
            .insert(schema.workoutPlanDocs)
            .values({
              id,
              userId: session.userId,
              planDate: bodyObj["planDate"] as string,
              title: (bodyObj["title"] as string) ?? null,
              contentMd: bodyObj["contentMd"] as string,
            });
          return new Response(JSON.stringify({ ok: true, id }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/plans", body: bodyObj },
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
