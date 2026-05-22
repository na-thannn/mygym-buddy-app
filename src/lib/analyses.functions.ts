import { createServerFn } from "@tanstack/react-start";
import logDevError from '@/lib/error-logger';
import { z } from "zod";
import { desc, eq } from "drizzle-orm";

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
  contentMd: z.string().min(1).max(50_000),
});

export const saveAnalysis = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => saveInput.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const { newId } = await import("@/server/auth");
    const id = newId();
    try {
      db.insert(schema.analyses).values({
        id,
        userId: session.userId,
        planDate: data.planDate,
        contentMd: data.contentMd,
      }).run();
      return { ok: true, id };
    } catch (err: any) {
      await logDevError({ error: err, req: null }).catch(() => {});
      throw new Response('Server error', { status: 500 });
    }
  });

export const listAnalyses = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    return db
      .select()
      .from(schema.analyses)
      .where(eq(schema.analyses.userId, session.userId))
      .orderBy(desc(schema.analyses.createdAt))
      .limit(100)
      .all();
  });