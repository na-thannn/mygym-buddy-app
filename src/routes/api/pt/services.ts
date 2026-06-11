import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { canManagePtServices } from "@/lib/crm";
import { parseRequestBody } from "@/lib/request-utils";
import { getSessionUser } from "@/server/auth";
import { db, schema } from "@/server/db";
import { json } from "@/server/crm";

const updateSchema = z.object({
  ptId: z.string().optional(),
  serviceOfferingIds: z.array(z.string()).max(100),
  bioEn: z.string().max(1000).optional(),
  bioVi: z.string().max(1000).optional(),
  specialtiesEn: z.string().max(500).optional(),
  specialtiesVi: z.string().max(500).optional(),
  yearsExperience: z.number().int().min(0).max(80).optional(),
  photoPath: z.string().nullable().optional(),
  isPublic: z.number().int().min(0).max(1).optional(),
});

export const Route = createFileRoute("/api/pt/services")({
  server: {
    handlers: {
      GET: async (ctx: unknown) => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        const maybe = ctx as { request?: Request };
        const request = maybe.request ?? (ctx as Request);
        const requestedPtId = new URL(request.url).searchParams.get("ptId") ?? session.userId;
        if (!canManagePtServices({ userId: session.userId, role: session.role }, requestedPtId)) {
          return json({ error: "Forbidden" }, 403);
        }
        const [services, selected, profileRows] = await Promise.all([
          db
            .select()
            .from(schema.serviceOfferings)
            .where(eq(schema.serviceOfferings.active, 1))
            .orderBy(asc(schema.serviceOfferings.sortOrder), asc(schema.serviceOfferings.nameEn)),
          db
            .select()
            .from(schema.ptServiceOfferings)
            .where(eq(schema.ptServiceOfferings.ptId, requestedPtId)),
          db.select().from(schema.ptProfiles).where(eq(schema.ptProfiles.userId, requestedPtId)).limit(1),
        ]);
        return json({ services, selected, profile: profileRows[0] ?? null, ptId: requestedPtId });
      },
      POST: async (ctx: unknown) => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        const maybe = ctx as { request?: Request };
        const request = maybe.request ?? (ctx as Request);
        const parsed = updateSchema.safeParse(await parseRequestBody(request as unknown));
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
        const ptId = parsed.data.ptId ?? session.userId;
        if (!canManagePtServices({ userId: session.userId, role: session.role }, ptId)) {
          return json({ error: "Forbidden" }, 403);
        }
        await db.delete(schema.ptServiceOfferings).where(eq(schema.ptServiceOfferings.ptId, ptId));
        if (parsed.data.serviceOfferingIds.length > 0) {
          await db.insert(schema.ptServiceOfferings).values(
            parsed.data.serviceOfferingIds.map((serviceOfferingId) => ({
              ptId,
              serviceOfferingId,
              active: 1,
            })),
          );
        }

        const profilePatch = {
          userId: ptId,
          bioEn: parsed.data.bioEn ?? "",
          bioVi: parsed.data.bioVi ?? "",
          specialtiesEn: parsed.data.specialtiesEn ?? "",
          specialtiesVi: parsed.data.specialtiesVi ?? "",
          yearsExperience: parsed.data.yearsExperience ?? 0,
          photoPath: parsed.data.photoPath ?? null,
          isPublic: parsed.data.isPublic ?? 1,
          updatedAt: new Date().toISOString(),
        };
        const [existingProfile] = await db
          .select({ userId: schema.ptProfiles.userId })
          .from(schema.ptProfiles)
          .where(eq(schema.ptProfiles.userId, ptId))
          .limit(1);
        if (existingProfile) {
          await db.update(schema.ptProfiles).set(profilePatch).where(eq(schema.ptProfiles.userId, ptId));
        } else {
          await db.insert(schema.ptProfiles).values({ ...profilePatch, createdAt: new Date().toISOString() });
        }
        return json({ ok: true });
      },
    },
  },
});
