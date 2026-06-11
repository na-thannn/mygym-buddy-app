import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, validateSessionToken, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import type { MaybeWrappedRequest } from "@/types/dev";

export const Route = createFileRoute("/api/log/workout")({
  server: {
    handlers: {
      GET: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) return new Response(null, { status: 204 });
        const url = new URL(request.url);
        const fromDate = url.searchParams.get("fromDate");
        const toDate = url.searchParams.get("toDate");
        const limit = Number(url.searchParams.get("limit") || "50");
        const where = [eq(schema.workoutLogs.userId, session.userId)];
        if (fromDate) where.push(gte(schema.workoutLogs.performedAt, fromDate));
        if (toDate) where.push(lte(schema.workoutLogs.performedAt, toDate));
        const rows = await db
          .select()
          .from(schema.workoutLogs)
          .where(and(...where))
          .orderBy(desc(schema.workoutLogs.performedAt), desc(schema.workoutLogs.createdAt))
          .limit(limit);
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
        if (!bodyObj || !bodyObj.exercise)
          return new Response(JSON.stringify({ error: "Missing exercise" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        const id = newId();
        const exerciseVal = bodyObj["exercise"];
        const exercise = typeof exerciseVal === "string" ? exerciseVal : String(exerciseVal ?? "");
        const setsVal = bodyObj["sets"];
        const sets =
          typeof setsVal === "number" ? setsVal : setsVal ? Number(String(setsVal)) : null;
        const repsVal = bodyObj["reps"];
        const reps = repsVal ? String(repsVal) : null;
        const weightKgVal = bodyObj["weightKg"] ?? bodyObj["weight"];
        const weightKg =
          typeof weightKgVal === "number"
            ? weightKgVal
            : weightKgVal
              ? Number(String(weightKgVal))
              : null;
        const performedAt = (bodyObj["performedAt"] ??
          bodyObj["date"] ??
          new Date().toISOString().slice(0, 10)) as string;
        try {
          await db
            .insert(schema.workoutLogs)
            .values({
              id,
              userId: session.userId,
              performedAt,
              exercise,
              sets,
              reps,
              weightKg,
              notes: typeof bodyObj?.notes === "string" ? (bodyObj.notes as string) : null,
              dayLabel: typeof bodyObj?.dayLabel === "string" ? (bodyObj.dayLabel as string) : null,
              muscleGroup:
                typeof bodyObj?.muscleGroup === "string" ? (bodyObj.muscleGroup as string) : null,
            });
          return new Response(JSON.stringify({ ok: true, id }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/log/workout", body: bodyObj },
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
