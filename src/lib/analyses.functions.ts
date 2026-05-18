import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireAuth, newId } from "@/server/auth";

const saveInput = z.object({
  planDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  contentMd: z.string().min(1).max(50_000),
});

export const saveAnalysis = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => saveInput.parse(d))
  .handler(async ({ data, context }) => {
    const id = newId();
    db.insert(schema.analyses).values({
      id,
      userId: context.userId,
      planDate: data.planDate,
      contentMd: data.contentMd,
    }).run();
    return { ok: true, id };
  });

export const listAnalyses = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return db
      .select()
      .from(schema.analyses)
      .where(eq(schema.analyses.userId, context.userId))
      .orderBy(desc(schema.analyses.createdAt))
      .limit(100)
      .all();
  });