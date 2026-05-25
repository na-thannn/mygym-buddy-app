import { createServerFn } from "@tanstack/react-start";
import logDevError from "@/lib/error-logger";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";

async function requireSession() {
  const { readSessionCookie, validateSessionToken } = await import("@/server/auth");
  const token = readSessionCookie();
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const session = validateSessionToken(token);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return session;
}

const saveInput = z.object({
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().max(200).optional().nullable(),
  contentMd: z.string().min(1).max(50_000),
});

export const savePlan = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => saveInput.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const { newId } = await import("@/server/auth");
    const id = newId();
    try {
      db.insert(schema.workoutPlanDocs)
        .values({
          id,
          userId: session.userId,
          planDate: data.planDate,
          title: data.title ?? null,
          contentMd: data.contentMd,
        })
        .run();
      return { ok: true, id };
    } catch (err) {
      await logDevError({ error: err, req: null }).catch(() => {});
      throw new Response("Server error", { status: 500 });
    }
  });

export const listPlans = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireSession();
  const { db, schema } = await import("@/server/db");
  return db
    .select()
    .from(schema.workoutPlanDocs)
    .where(eq(schema.workoutPlanDocs.userId, session.userId))
    .orderBy(desc(schema.workoutPlanDocs.planDate), desc(schema.workoutPlanDocs.createdAt))
    .limit(100)
    .all();
});

export const getPlanByDate = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ planDate: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    return db
      .select()
      .from(schema.workoutPlanDocs)
      .where(
        and(
          eq(schema.workoutPlanDocs.userId, session.userId),
          eq(schema.workoutPlanDocs.planDate, data.planDate),
        ),
      )
      .orderBy(desc(schema.workoutPlanDocs.createdAt))
      .get();
  });
