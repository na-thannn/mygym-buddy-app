import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, validateSessionToken, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { eq, desc } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import type { MaybeWrappedRequest } from "@/types/dev";

export const Route = createFileRoute("/api/progress-report")({
  server: {
    handlers: {
      GET: async () => {
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session) return new Response(null, { status: 204 });
        const rows = db
          .select()
          .from(schema.progressReports)
          .where(eq(schema.progressReports.userId, session.userId))
          .orderBy(desc(schema.progressReports.reportDate))
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
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        const reportDate = (bodyObj["reportDate"] ?? bodyObj["date"] ?? null) as string | null;
        if (!reportDate)
          return new Response(JSON.stringify({ error: "Missing reportDate" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        const id = newId();
        try {
          db.insert(schema.progressReports)
            .values({
              id,
              userId: session.userId,
              reportDate,
              totalSessions: (bodyObj["totalSessions"] as number) ?? 0,
              streakDays: (bodyObj["streakDays"] as number) ?? 0,
              totalVolume: (bodyObj["totalVolume"] as number) ?? 0,
              notes: (bodyObj["notes"] as string) ?? null,
            })
            .run();
          return new Response(JSON.stringify({ ok: true, id }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/progress-report", body: bodyObj },
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
