import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/server/auth";
import { db, schema } from "@/server/db";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getRequest(ctx: unknown): Request {
  const maybe = ctx as { request?: Request };
  return maybe.request ?? (ctx as Request);
}

const ptSchema = z.object({
  ptId: z.string().min(1),
  bioEn: z.string().max(4000).optional().default(""),
  specialtiesEn: z.string().max(2000).optional().default(""),
  yearsExperience: z.number().int().min(0).max(80).optional().default(0),
  isPublic: z.boolean().optional().default(true),
  // Full data URL (data:image/...;base64,...). null clears the photo, undefined keeps it.
  photoBase64: z.string().max(8_000_000).nullable().optional(),
});

export const Route = createFileRoute("/api/admin/pt-profiles")({
  server: {
    handlers: {
      POST: async (ctx: unknown) => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        if (session.role !== "admin") return json({ error: "Forbidden" }, 403);

        const body = await parseRequestBody(getRequest(ctx) as unknown);
        const parsed = ptSchema.safeParse(body ?? {});
        if (!parsed.success) {
          return json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
        }
        const data = parsed.data;

        try {
          const [pt] = await db
            .select({ id: schema.users.id, role: schema.users.role })
            .from(schema.users)
            .where(eq(schema.users.id, data.ptId))
            .limit(1);
          if (!pt || pt.role !== "pt") {
            return json({ error: "Trainer not found" }, 404);
          }

          const [existing] = await db
            .select({ userId: schema.ptProfiles.userId })
            .from(schema.ptProfiles)
            .where(eq(schema.ptProfiles.userId, data.ptId))
            .limit(1);

          const now = new Date().toISOString();
          const isPublic = data.isPublic ? 1 : 0;

          if (existing) {
            await db
              .update(schema.ptProfiles)
              .set({
                bioEn: data.bioEn,
                bioVi: data.bioEn,
                specialtiesEn: data.specialtiesEn,
                specialtiesVi: data.specialtiesEn,
                yearsExperience: data.yearsExperience,
                isPublic,
                ...(data.photoBase64 !== undefined ? { photoBase64: data.photoBase64 } : {}),
                updatedAt: now,
              })
              .where(eq(schema.ptProfiles.userId, data.ptId));
          } else {
            await db.insert(schema.ptProfiles).values({
              userId: data.ptId,
              bioEn: data.bioEn,
              bioVi: data.bioEn,
              specialtiesEn: data.specialtiesEn,
              specialtiesVi: data.specialtiesEn,
              yearsExperience: data.yearsExperience,
              isPublic,
              photoBase64: data.photoBase64 ?? null,
            });
          }
          return json({ ok: true });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/admin/pt-profiles" },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});
