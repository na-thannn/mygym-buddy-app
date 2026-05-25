import { createServerFn } from "@tanstack/react-start";
import logDevError from "@/lib/error-logger";
import { z } from "zod";
import { eq } from "drizzle-orm";

async function requireSession() {
  const { readSessionCookie, validateSessionToken } = await import("@/server/auth");
  const token = readSessionCookie();
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const session = validateSessionToken(token);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return session;
}

export const getProfile = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireSession();
  const { db, schema } = await import("@/server/db");
  const row = db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.userId, session.userId))
    .get();
  return row ?? null;
});

const saveProfileInput = z.object({
  goal: z.string().max(500).nullable().optional(),
  level: z.string().max(50).nullable().optional(),
  limitations: z.string().max(500).nullable().optional(),
  age: z.number().int().min(10).max(120).nullable().optional(),
  gender: z.string().max(20).nullable().optional(),
  heightCm: z.number().min(50).max(280).nullable().optional(),
  weightKg: z.number().min(20).max(400).nullable().optional(),
  targetWeightKg: z.number().min(20).max(400).nullable().optional(),
});

export const saveProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => saveProfileInput.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const existing = db
      .select({ userId: schema.profiles.userId })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, session.userId))
      .get();
    const patch = { ...data, updatedAt: new Date().toISOString() };
    if (existing) {
      db.update(schema.profiles).set(patch).where(eq(schema.profiles.userId, session.userId)).run();
    } else {
      try {
        db.insert(schema.profiles)
          .values({ userId: session.userId, ...patch })
          .run();
        return { ok: true };
      } catch (err) {
        await logDevError({ error: err, req: null }).catch(() => {});
        throw new Response("Server error", { status: 500 });
      }
    }
    return { ok: true };
  });
