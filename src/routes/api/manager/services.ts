import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import { requireManagerSession, json } from "@/server/crm";
import { db, schema } from "@/server/db";
import { newId } from "@/server/auth";

const serviceSchema = z.object({
  id: z.string().optional(),
  nameEn: z.string().trim().min(1).max(120),
  nameVi: z.string().trim().min(1).max(120).optional(),
  descriptionEn: z.string().max(1000).optional().default(""),
  descriptionVi: z.string().max(1000).optional().default(""),
  category: z.string().trim().min(1).max(80).default("training"),
  priceVnd: z.number().int().min(0),
  durationMinutes: z.number().int().min(1).max(1440).default(60),
  active: z.number().int().min(0).max(1).default(1),
  isPublic: z.number().int().min(0).max(1).default(1),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const Route = createFileRoute("/api/manager/services")({
  server: {
    handlers: {
      GET: async () => {
        await requireManagerSession();
        const services = await db
          .select()
          .from(schema.serviceOfferings)
          .orderBy(asc(schema.serviceOfferings.sortOrder), desc(schema.serviceOfferings.createdAt));
        return json({ services });
      },
      POST: async (ctx: unknown) => {
        const session = await requireManagerSession();
        const maybe = ctx as { request?: Request };
        const request = maybe.request ?? (ctx as Request);
        const parsed = serviceSchema.safeParse(await parseRequestBody(request as unknown));
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
        const id = parsed.data.id || newId();
        const { id: _inputId, ...serviceData } = parsed.data;
        const values = {
          ...serviceData,
          nameVi: serviceData.nameVi ?? serviceData.nameEn,
          descriptionVi: serviceData.descriptionVi ?? serviceData.descriptionEn,
          id,
          updatedAt: new Date().toISOString(),
        };
        if (parsed.data.id) {
          await db
            .update(schema.serviceOfferings)
            .set({
              ...serviceData,
              nameVi: values.nameVi,
              descriptionVi: values.descriptionVi,
              updatedAt: values.updatedAt,
            })
            .where(eq(schema.serviceOfferings.id, id));
        } else {
          await db.insert(schema.serviceOfferings).values(values);
        }
        await db.insert(schema.auditLogs).values({
          id: newId(),
          actorId: session.userId,
          action: parsed.data.id ? "service.update" : "service.create",
          entityType: "service_offering",
          entityId: id,
          afterJson: JSON.stringify(values),
        });
        return json({ ok: true, id });
      },
      DELETE: async (ctx: unknown) => {
        const session = await requireManagerSession();
        const maybe = ctx as { request?: Request };
        const request = maybe.request ?? (ctx as Request);
        const body = z.object({ id: z.string().min(1) }).parse(await parseRequestBody(request));
        await db
          .update(schema.serviceOfferings)
          .set({ active: 0, isPublic: 0, updatedAt: new Date().toISOString() })
          .where(eq(schema.serviceOfferings.id, body.id));
        await db.insert(schema.auditLogs).values({
          id: newId(),
          actorId: session.userId,
          action: "service.deactivate",
          entityType: "service_offering",
          entityId: body.id,
        });
        return json({ ok: true });
      },
    },
  },
});
