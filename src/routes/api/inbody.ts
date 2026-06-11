import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, validateSessionToken, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { eq, desc } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import type { MaybeWrappedRequest } from "@/types/dev";

function getRouteRequest(ctx: unknown): Request {
  const maybe = ctx as MaybeWrappedRequest;
  return (maybe.request as Request | undefined) ?? (ctx as Request);
}

export const Route = createFileRoute("/api/inbody")({
  server: {
    handlers: {
      GET: async () => {
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) return new Response(null, { status: 204 });
        const rows = await db
          .select()
          .from(schema.inbodyReports)
          .where(eq(schema.inbodyReports.userId, session.userId))
          .orderBy(desc(schema.inbodyReports.reportDate));
        return new Response(JSON.stringify(rows), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
      POST: async (ctx: unknown) => {
        const request = getRouteRequest(ctx);
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session)
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

        const reportDate = (bodyObj["reportDate"] ?? bodyObj["date"] ?? null) as string | null;
        if (!reportDate) {
          return new Response(JSON.stringify({ error: "Missing reportDate" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const weightKgVal = bodyObj["weightKg"] ?? bodyObj["weight"];
        const weightKg =
          typeof weightKgVal === "number"
            ? weightKgVal
            : weightKgVal
              ? Number(String(weightKgVal))
              : undefined;
        if (weightKg === undefined) {
          return new Response(JSON.stringify({ error: "Missing weightKg" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const muscleMassKgVal = bodyObj["muscleMassKg"] ?? bodyObj["muscleMass"];
        const muscleMassKg =
          typeof muscleMassKgVal === "number"
            ? muscleMassKgVal
            : muscleMassKgVal
              ? Number(String(muscleMassKgVal))
              : undefined;
        if (muscleMassKg === undefined) {
          return new Response(JSON.stringify({ error: "Missing muscleMassKg" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const bodyFatPercentVal = bodyObj["bodyFatPercent"] ?? bodyObj["bodyFat"];
        const bodyFatPercent =
          typeof bodyFatPercentVal === "number"
            ? bodyFatPercentVal
            : bodyFatPercentVal
              ? Number(String(bodyFatPercentVal))
              : undefined;

        const id = newId();
        const createdAt = new Date().toISOString();
        try {
          await db
            .insert(schema.inbodyReports)
            .values({
              id,
              userId: session.userId,
              weightKg: Number(weightKg) || 0,
              reportDate,
              muscleMassKg: Number(muscleMassKg) || 0,
              bodyFatPercent: Number(bodyFatPercent) || 0,
              createdAt,
            });
          return new Response(JSON.stringify({ ok: true, id }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/inbody", body: bodyObj },
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
