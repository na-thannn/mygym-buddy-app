import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireAuth, newId } from "@/server/auth";

const reportInput = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalSessions: z.number().int().min(0).max(50),
  streakDays: z.number().int().min(0).max(3650),
  totalVolume: z.number().min(0).max(1_000_000),
  notes: z.string().max(500).optional().nullable(),
});

export const saveProgressReport = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => reportInput.parse(d))
  .handler(async ({ data, context }) => {
    const id = newId();
    db.insert(schema.progressReports).values({ id, userId: context.userId, ...data }).run();
    return { ok: true, id };
  });

export const listProgressReports = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return db
      .select()
      .from(schema.progressReports)
      .where(eq(schema.progressReports.userId, context.userId))
      .orderBy(desc(schema.progressReports.reportDate))
      .limit(50)
      .all();
  });