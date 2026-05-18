import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { requireAuth } from "@/server/auth";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const row = db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, context.userId))
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
  .middleware([requireAuth])
  .inputValidator((d: unknown) => saveProfileInput.parse(d))
  .handler(async ({ data, context }) => {
    const existing = db
      .select({ userId: schema.profiles.userId })
      .from(schema.profiles)
      .where(eq(schema.profiles.userId, context.userId))
      .get();
    const patch = { ...data, updatedAt: new Date().toISOString() };
    if (existing) {
      db.update(schema.profiles).set(patch).where(eq(schema.profiles.userId, context.userId)).run();
    } else {
      db.insert(schema.profiles).values({ userId: context.userId, ...patch }).run();
    }
    return { ok: true };
  });