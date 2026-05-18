import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireAuth, newId } from "@/server/auth";

const saveInput = z.object({
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().max(200).optional().nullable(),
  contentMd: z.string().min(1).max(50_000),
});

export const savePlan = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => saveInput.parse(d))
  .handler(async ({ data, context }) => {
    const id = newId();
    db.insert(schema.workoutPlanDocs).values({
      id,
      userId: context.userId,
      planDate: data.planDate,
      title: data.title ?? null,
      contentMd: data.contentMd,
    }).run();
    return { ok: true, id };
  });

export const listPlans = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return db
      .select()
      .from(schema.workoutPlanDocs)
      .where(eq(schema.workoutPlanDocs.userId, context.userId))
      .orderBy(desc(schema.workoutPlanDocs.planDate), desc(schema.workoutPlanDocs.createdAt))
      .limit(100)
      .all();
  });

export const getPlanByDate = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => z.object({ planDate: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    return db
      .select()
      .from(schema.workoutPlanDocs)
      .where(and(eq(schema.workoutPlanDocs.userId, context.userId), eq(schema.workoutPlanDocs.planDate, data.planDate)))
      .orderBy(desc(schema.workoutPlanDocs.createdAt))
      .get();
  });