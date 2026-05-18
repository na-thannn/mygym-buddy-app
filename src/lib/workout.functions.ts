import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireAuth, newId } from "@/server/auth";

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
  .middleware([requireAuth])
  .inputValidator((d: unknown) => logInput.parse(d))
  .handler(async ({ data, context }) => {
    const id = newId();
    db.insert(schema.workoutLogs).values({ id, userId: context.userId, ...data }).run();
    return { ok: true, id };
  });

export const listRecentWorkouts = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) =>
    z.object({ fromDate: z.string().optional(), toDate: z.string().optional(), limit: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const where = [eq(schema.workoutLogs.userId, context.userId)];
    if (data.fromDate) where.push(gte(schema.workoutLogs.performedAt, data.fromDate));
    if (data.toDate) where.push(lte(schema.workoutLogs.performedAt, data.toDate));
    return db
      .select()
      .from(schema.workoutLogs)
      .where(and(...where))
      .orderBy(desc(schema.workoutLogs.performedAt), desc(schema.workoutLogs.createdAt))
      .limit(data.limit)
      .all();
  });