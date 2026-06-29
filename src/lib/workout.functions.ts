import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, desc, eq, gte, lte } from "drizzle-orm";

async function requireSession() {
  const { readSessionCookie, validateSessionToken } = await import("@/server/auth");
  const token = readSessionCookie();
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const session = await validateSessionToken(token);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return session;
}

const logInput = z.object({
  performedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayLabel: z.string().max(40).optional().nullable(),
  muscleGroup: z.string().max(80).optional().nullable(),
  exercise: z.string().min(1).max(120),
  sets: z.number().int().min(1).max(50).optional().nullable(),
  reps: z.string().max(40).optional().nullable(),
  weightKg: z.number().min(0).max(1000).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const logWorkoutEntry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => logInput.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const { newId } = await import("@/server/auth");
    const id = newId();
    await db.insert(schema.workoutLogs).values({ id, userId: session.userId, ...data });
    return { ok: true, id };
  });

const updateInput = logInput.extend({
  id: z.string().min(1),
});

export const updateWorkoutEntry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const { eq, and } = await import("drizzle-orm");
    const { id, ...fields } = data;
    const [existing] = await db
      .select({ id: schema.workoutLogs.id })
      .from(schema.workoutLogs)
      .where(and(eq(schema.workoutLogs.id, id), eq(schema.workoutLogs.userId, session.userId)))
      .limit(1);
    if (!existing) throw new Response("Not found", { status: 404 });
    await db
      .update(schema.workoutLogs)
      .set(fields)
      .where(and(eq(schema.workoutLogs.id, id), eq(schema.workoutLogs.userId, session.userId)));
    return { ok: true, id };
  });

export const deleteWorkoutEntry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const { eq, and } = await import("drizzle-orm");
    const [existing] = await db
      .select({ id: schema.workoutLogs.id })
      .from(schema.workoutLogs)
      .where(and(eq(schema.workoutLogs.id, data.id), eq(schema.workoutLogs.userId, session.userId)))
      .limit(1);
    if (!existing) throw new Response("Not found", { status: 404 });
    await db
      .delete(schema.workoutLogs)
      .where(and(eq(schema.workoutLogs.id, data.id), eq(schema.workoutLogs.userId, session.userId)));
    return { ok: true };
  });

export const listRecentWorkouts = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const where = [eq(schema.workoutLogs.userId, session.userId)];
    if (data.fromDate) where.push(gte(schema.workoutLogs.performedAt, data.fromDate));
    if (data.toDate) where.push(lte(schema.workoutLogs.performedAt, data.toDate));
    return await db
      .select()
      .from(schema.workoutLogs)
      .where(and(...where))
      .orderBy(desc(schema.workoutLogs.performedAt), desc(schema.workoutLogs.createdAt))
      .limit(data.limit);
  });
