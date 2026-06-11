import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import { requireManagerSession, json } from "@/server/crm";
import { db, schema } from "@/server/db";
import { newId } from "@/server/auth";

const packageSchema = z.object({
  id: z.string().optional(),
  nameEn: z.string().trim().min(1).max(120),
  nameVi: z.string().trim().min(1).max(120),
  descriptionEn: z.string().max(1000).optional().default(""),
  descriptionVi: z.string().max(1000).optional().default(""),
  audience: z.string().trim().min(1).max(80).default("general"),
  priceVnd: z.number().int().min(0),
  durationDays: z.number().int().min(1).max(3660),
  bonusDays: z.number().int().min(0).max(3660).default(0),
  includesPtSessions: z.number().int().min(0).max(999).default(0),
  active: z.number().int().min(0).max(1).default(1),
  isPublic: z.number().int().min(0).max(1).default(1),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const Route = createFileRoute("/api/manager/packages")({
  server: {
    handlers: {
      GET: async () => {
        await requireManagerSession();
        const plans = await db
          .select()
          .from(schema.membershipPlans)
          .orderBy(asc(schema.membershipPlans.sortOrder), desc(schema.membershipPlans.createdAt));
        return json({ plans });
      },
      POST: async (ctx: unknown) => {
        const session = await requireManagerSession();
        const maybe = ctx as { request?: Request };
        const request = maybe.request ?? (ctx as Request);
        const parsed = packageSchema.safeParse(await parseRequestBody(request as unknown));
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
        const id = parsed.data.id || newId();
        const { id: _inputId, ...planData } = parsed.data;
        const values = { ...planData, id, updatedAt: new Date().toISOString() };
        if (parsed.data.id) {
          await db
            .update(schema.membershipPlans)
            .set({ ...planData, updatedAt: values.updatedAt })
            .where(eq(schema.membershipPlans.id, id));
        } else {
          await db.insert(schema.membershipPlans).values(values);
        }
        await db.insert(schema.auditLogs).values({
          id: newId(),
          actorId: session.userId,
          action: parsed.data.id ? "membership_plan.update" : "membership_plan.create",
          entityType: "membership_plan",
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
          .update(schema.membershipPlans)
          .set({ active: 0, isPublic: 0, updatedAt: new Date().toISOString() })
          .where(eq(schema.membershipPlans.id, body.id));
        await db.insert(schema.auditLogs).values({
          id: newId(),
          actorId: session.userId,
          action: "membership_plan.deactivate",
          entityType: "membership_plan",
          entityId: body.id,
        });
        return json({ ok: true });
      },
    },
  },
});
