import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import { requireManagerSession, json } from "@/server/crm";
import { db, schema } from "@/server/db";
import { newId } from "@/server/auth";

const membershipSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().min(1),
  planId: z.string().nullable().optional(),
  status: z.enum(["active", "paused", "cancelled", "expired"]).default("active"),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priceVndAtPurchase: z.number().int().min(0).default(0),
  assignedPtId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const Route = createFileRoute("/api/manager/memberships")({
  server: {
    handlers: {
      GET: async () => {
        await requireManagerSession();
        const memberships = await db
          .select()
          .from(schema.memberships)
          .orderBy(desc(schema.memberships.updatedAt))
          .limit(500);
        return json({ memberships });
      },
      POST: async (ctx: unknown) => {
        await requireManagerSession();
        const maybe = ctx as { request?: Request };
        const request = maybe.request ?? (ctx as Request);
        const parsed = membershipSchema.safeParse(await parseRequestBody(request as unknown));
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
        const id = parsed.data.id || newId();
        const { id: _inputId, ...membershipData } = parsed.data;
        const values = {
          ...membershipData,
          id,
          planId: membershipData.planId ?? null,
          assignedPtId: membershipData.assignedPtId ?? null,
          notes: membershipData.notes ?? null,
          updatedAt: new Date().toISOString(),
        };
        if (parsed.data.id) {
          await db
            .update(schema.memberships)
            .set({
              ...membershipData,
              planId: values.planId,
              assignedPtId: values.assignedPtId,
              notes: values.notes,
              updatedAt: values.updatedAt,
            })
            .where(eq(schema.memberships.id, id));
        } else {
          await db.insert(schema.memberships).values(values);
        }
        return json({ ok: true, id });
      },
    },
  },
});
