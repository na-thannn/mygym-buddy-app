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

const inputSchema = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number().positive(),
  muscleMassKg: z.number().positive(),
  bodyFatPercent: z.number().positive(),
});

export const saveInbodyReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const { newId } = await import("@/server/auth");
    
    const id = newId();
    try {
      db.insert(schema.inbodyReports).values({ id, userId: session.userId, ...data }).run();
      return { ok: true, id };
    } catch (err: any) {
      await logDevError({ error: err, req: null }).catch(() => {});
      throw new Response('Server error', { status: 500 });
    }
  });

export const listInbodyReports = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    
    return db
      .select()
      .from(schema.inbodyReports)
      .where(eq(schema.inbodyReports.userId, session.userId))
      .orderBy(desc(schema.inbodyReports.reportDate))
      .all();
  });