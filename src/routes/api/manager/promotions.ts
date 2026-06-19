import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import { requireManagerSession, json } from "@/server/crm";
import { db, schema } from "@/server/db";
import { newId } from "@/server/auth";

const promotionSchema = z.object({
  id: z.string().optional(),
  titleEn: z.string().trim().min(1).max(140),
  titleVi: z.string().trim().min(1).max(140).optional(),
  bodyEn: z.string().max(1500).optional().default(""),
  bodyVi: z.string().max(1500).optional().default(""),
  validFrom: z.string().nullable().optional(),
  validTo: z.string().nullable().optional(),
  bonusTermsEn: z.string().max(1000).optional().default(""),
  bonusTermsVi: z.string().max(1000).optional().default(""),
  relatedPlanId: z.string().nullable().optional(),
  relatedServiceId: z.string().nullable().optional(),
  active: z.number().int().min(0).max(1).default(1),
  isPublic: z.number().int().min(0).max(1).default(1),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const Route = createFileRoute("/api/manager/promotions")({
  server: {
    handlers: {
      GET: async () => {
        await requireManagerSession();
        const promotions = await db
          .select()
          .from(schema.promotions)
          .orderBy(asc(schema.promotions.sortOrder), desc(schema.promotions.createdAt));
        return json({ promotions });
      },
      POST: async (ctx: unknown) => {
        const session = await requireManagerSession();
        const maybe = ctx as { request?: Request };
        const request = maybe.request ?? (ctx as Request);
        const parsed = promotionSchema.safeParse(await parseRequestBody(request as unknown));
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
        const id = parsed.data.id || newId();
        const { id: _inputId, ...promotionData } = parsed.data;
        const values = {
          ...promotionData,
          id,
          titleVi: promotionData.titleVi ?? promotionData.titleEn,
          bodyVi: promotionData.bodyVi ?? promotionData.bodyEn,
          bonusTermsVi: promotionData.bonusTermsVi ?? promotionData.bonusTermsEn,
          validFrom: promotionData.validFrom ?? null,
          validTo: promotionData.validTo ?? null,
          relatedPlanId: promotionData.relatedPlanId ?? null,
          relatedServiceId: promotionData.relatedServiceId ?? null,
          updatedAt: new Date().toISOString(),
        };
        if (parsed.data.id) {
          await db
            .update(schema.promotions)
            .set({
              ...promotionData,
              titleVi: values.titleVi,
              bodyVi: values.bodyVi,
              bonusTermsVi: values.bonusTermsVi,
              validFrom: values.validFrom,
              validTo: values.validTo,
              relatedPlanId: values.relatedPlanId,
              relatedServiceId: values.relatedServiceId,
              updatedAt: values.updatedAt,
            })
            .where(eq(schema.promotions.id, id));
        } else {
          await db.insert(schema.promotions).values(values);
        }
        await db.insert(schema.auditLogs).values({
          id: newId(),
          actorId: session.userId,
          action: parsed.data.id ? "promotion.update" : "promotion.create",
          entityType: "promotion",
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
          .update(schema.promotions)
          .set({ active: 0, isPublic: 0, updatedAt: new Date().toISOString() })
          .where(eq(schema.promotions.id, body.id));
        await db.insert(schema.auditLogs).values({
          id: newId(),
          actorId: session.userId,
          action: "promotion.deactivate",
          entityType: "promotion",
          entityId: body.id,
        });
        return json({ ok: true });
      },
    },
  },
});
