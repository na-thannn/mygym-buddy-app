import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { getSessionUser, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function requireAdmin() {
  const session = await getSessionUser();
  if (!session) return { error: json({ error: "Unauthorized" }, 401) };
  if (session.role !== "admin") return { error: json({ error: "Forbidden" }, 403) };
  return { session };
}

function getRequest(ctx: unknown): Request {
  const maybe = ctx as { request?: Request };
  return maybe.request ?? (ctx as Request);
}

const branchSchema = z.object({
  nameEn: z.string().min(1).max(200).optional(),
  addressEn: z.string().min(1).max(300),
  phone: z.string().min(1).max(60),
  hoursEn: z.string().min(1).max(300),
  mapUrl: z.string().max(1000).optional().default(""),
  facebookUrl: z.string().max(1000).optional().default(""),
});

export const Route = createFileRoute("/api/admin/site-content")({
  server: {
    handlers: {
      GET: async () => {
        const auth = await requireAdmin();
        if (auth.error) return auth.error;
        try {
          const [branch] = await db
            .select()
            .from(schema.branches)
            .orderBy(asc(schema.branches.createdAt))
            .limit(1);
          const pts = await db
            .select({
              id: schema.users.id,
              email: schema.users.email,
              displayName: schema.users.displayName,
              bioEn: schema.ptProfiles.bioEn,
              bioVi: schema.ptProfiles.bioVi,
              specialtiesEn: schema.ptProfiles.specialtiesEn,
              specialtiesVi: schema.ptProfiles.specialtiesVi,
              photoPath: schema.ptProfiles.photoPath,
              photoBase64: schema.ptProfiles.photoBase64,
              yearsExperience: schema.ptProfiles.yearsExperience,
              isPublic: schema.ptProfiles.isPublic,
            })
            .from(schema.users)
            .leftJoin(schema.ptProfiles, eq(schema.users.id, schema.ptProfiles.userId))
            .where(eq(schema.users.role, "pt"))
            .orderBy(asc(schema.users.displayName));
          const photos = await db
            .select()
            .from(schema.gymPhotos)
            .orderBy(asc(schema.gymPhotos.sortOrder), asc(schema.gymPhotos.createdAt));
          return json({ branch: branch ?? null, pts, photos });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "GET", url: "/api/admin/site-content" },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
      POST: async (ctx: unknown) => {
        const auth = await requireAdmin();
        if (auth.error) return auth.error;
        const body = await parseRequestBody(getRequest(ctx) as unknown);
        const parsed = branchSchema.safeParse(body ?? {});
        if (!parsed.success) {
          return json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
        }
        const data = parsed.data;
        const now = new Date().toISOString();
        try {
          const [existing] = await db
            .select({ id: schema.branches.id })
            .from(schema.branches)
            .orderBy(asc(schema.branches.createdAt))
            .limit(1);
          if (existing) {
            await db
              .update(schema.branches)
              .set({
                ...(data.nameEn ? { nameEn: data.nameEn } : {}),
                ...(data.nameEn ? { nameVi: data.nameEn } : {}),
                addressEn: data.addressEn,
                addressVi: data.addressEn,
                phone: data.phone,
                hoursEn: data.hoursEn,
                hoursVi: data.hoursEn,
                mapUrl: data.mapUrl,
                facebookUrl: data.facebookUrl,
                updatedAt: now,
              })
              .where(eq(schema.branches.id, existing.id));
            return json({ ok: true, id: existing.id });
          }
          const id = newId();
          await db.insert(schema.branches).values({
            id,
            nameEn: data.nameEn ?? "HL Fitness",
            nameVi: data.nameEn ?? "HL Fitness",
            addressEn: data.addressEn,
            addressVi: data.addressEn,
            phone: data.phone,
            hoursEn: data.hoursEn,
            hoursVi: data.hoursEn,
            mapUrl: data.mapUrl,
            facebookUrl: data.facebookUrl,
          });
          return json({ ok: true, id });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/admin/site-content" },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});
