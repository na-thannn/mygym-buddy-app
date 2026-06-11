import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import logDevError from "@/lib/error-logger";

async function requireSession() {
  const { readSessionCookie, validateSessionToken } = await import("@/server/auth");
  const token = readSessionCookie();
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const session = await validateSessionToken(token);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return session;
}

const reportInput = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalSessions: z.number().int().min(0).max(50),
  streakDays: z.number().int().min(0).max(3650),
  totalVolume: z.number().min(0).max(1_000_000),
  notes: z.string().max(500).optional().nullable(),
});

export const saveProgressReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => reportInput.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const { newId } = await import("@/server/auth");
    const id = newId();
    try {
      await db.insert(schema.progressReports).values({ id, userId: session.userId, ...data });
      return { ok: true, id };
    } catch (err) {
      await logDevError({ error: err, req: null }).catch(() => {});
      throw new Response("Server error", { status: 500 });
    }
  });

export const listProgressReports = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireSession();
  const { db, schema } = await import("@/server/db");
  return await db
    .select()
    .from(schema.progressReports)
    .where(eq(schema.progressReports.userId, session.userId))
    .orderBy(desc(schema.progressReports.reportDate))
    .limit(50);
});
