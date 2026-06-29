import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, validateSessionToken, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import type { MaybeWrappedRequest } from "@/types/dev";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getRouteRequest(ctx: unknown): Request {
  const maybe = ctx as MaybeWrappedRequest;
  return (maybe.request as Request | undefined) ?? (ctx as Request);
}

async function getOwnedWorkout(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(schema.workoutLogs)
    .where(and(eq(schema.workoutLogs.id, id), eq(schema.workoutLogs.userId, userId)))
    .limit(1);
  return row ?? null;
}

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
      PATCH: async (ctx: unknown) => {
        const request = getRouteRequest(ctx);
        const token = readSessionCookie();
        const session = token ? await validateSessionToken(token) : null;
        if (!session) return json({ error: "Unauthorized" }, 401);

        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
        const id = typeof bodyObj?.id === "string" ? bodyObj.id.trim() : "";
        if (!id) return json({ error: "Missing id" }, 400);

        const existing = await getOwnedWorkout(session.userId, id);
        if (!existing) return json({ error: "Not found" }, 404);

        const exerciseVal = bodyObj?.exercise;
        const exercise =
          typeof exerciseVal === "string"
            ? exerciseVal.trim()
            : exerciseVal !== undefined
              ? String(exerciseVal)
              : existing.exercise;
        if (!exercise) return json({ error: "Missing exercise" }, 400);

        const setsVal = bodyObj?.sets;
        const sets =
          setsVal === undefined
            ? existing.sets
            : typeof setsVal === "number"
              ? setsVal
              : setsVal
                ? Number(String(setsVal))
                : null;
        const repsVal = bodyObj?.reps;
        const reps =
          repsVal === undefined ? existing.reps : repsVal ? String(repsVal) : null;
        const weightKgVal = bodyObj?.weightKg ?? bodyObj?.weight;
        const weightKg =
          weightKgVal === undefined
            ? existing.weightKg
            : typeof weightKgVal === "number"
              ? weightKgVal
              : weightKgVal
                ? Number(String(weightKgVal))
                : null;
        const performedAt =
          typeof bodyObj?.performedAt === "string"
            ? bodyObj.performedAt
            : typeof bodyObj?.date === "string"
              ? bodyObj.date
              : existing.performedAt;

        try {
          await db
            .update(schema.workoutLogs)
            .set({
              performedAt,
              exercise,
              sets,
              reps,
              weightKg,
              notes:
                bodyObj?.notes !== undefined
                  ? typeof bodyObj.notes === "string"
                    ? bodyObj.notes
                    : null
                  : existing.notes,
              dayLabel:
                bodyObj?.dayLabel !== undefined
                  ? typeof bodyObj.dayLabel === "string"
                    ? bodyObj.dayLabel
                    : null
                  : existing.dayLabel,
              muscleGroup:
                bodyObj?.muscleGroup !== undefined
                  ? typeof bodyObj.muscleGroup === "string"
                    ? bodyObj.muscleGroup
                    : null
                  : existing.muscleGroup,
            })
            .where(
              and(eq(schema.workoutLogs.id, id), eq(schema.workoutLogs.userId, session.userId)),
            );
          return json({ ok: true, id });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "PATCH", url: "/api/log/workout", body: bodyObj },
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

        const existing = await getOwnedWorkout(session.userId, id);
        if (!existing) return json({ error: "Not found" }, 404);

        try {
          await db
            .delete(schema.workoutLogs)
            .where(
              and(eq(schema.workoutLogs.id, id), eq(schema.workoutLogs.userId, session.userId)),
            );
          return json({ ok: true });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "DELETE", url: "/api/log/workout", body: bodyObj },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});
