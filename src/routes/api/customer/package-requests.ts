import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { canTransitionPurchaseRequest, type PurchaseRequestStatus } from "@/lib/crm";
import { parseRequestBody } from "@/lib/request-utils";
import { getSessionUser, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { json } from "@/server/crm";

const createSchema = z
  .object({
    planId: z.string().nullable().optional(),
    serviceOfferingId: z.string().nullable().optional(),
    preferredPtId: z.string().nullable().optional(),
    message: z.string().max(1000).optional().default(""),
    contactPhone: z.string().max(40).optional().default(""),
    requestedStartDate: z.string().nullable().optional(),
  })
  .refine((value) => value.planId || value.serviceOfferingId, {
    message: "Choose a plan or service",
  });

export const Route = createFileRoute("/api/customer/package-requests")({
  server: {
    handlers: {
      GET: async () => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        if (session.role !== "customer") return json({ error: "Forbidden" }, 403);
        const requests = await db
          .select()
          .from(schema.purchaseRequests)
          .where(eq(schema.purchaseRequests.customerId, session.userId))
          .orderBy(desc(schema.purchaseRequests.createdAt))
          .limit(100);
        return json({ requests });
      },
      POST: async (ctx: unknown) => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        if (session.role !== "customer") return json({ error: "Forbidden" }, 403);
        const maybe = ctx as { request?: Request };
        const request = maybe.request ?? (ctx as Request);
        const parsed = createSchema.safeParse(await parseRequestBody(request as unknown));
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
        const id = newId();
        await db.insert(schema.purchaseRequests).values({
          id,
          customerId: session.userId,
          planId: parsed.data.planId ?? null,
          serviceOfferingId: parsed.data.serviceOfferingId ?? null,
          preferredPtId: parsed.data.preferredPtId ?? null,
          message: parsed.data.message,
          contactPhone: parsed.data.contactPhone,
          requestedStartDate: parsed.data.requestedStartDate ?? null,
          source: "customer",
        });
        return json({ ok: true, id }, 201);
      },
      PATCH: async (ctx: unknown) => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        if (session.role !== "customer") return json({ error: "Forbidden" }, 403);
        const maybe = ctx as { request?: Request };
        const request = maybe.request ?? (ctx as Request);
        const body = z
          .object({ id: z.string().min(1), status: z.literal("cancelled") })
          .parse(await parseRequestBody(request));
        const [row] = await db
          .select()
          .from(schema.purchaseRequests)
          .where(eq(schema.purchaseRequests.id, body.id))
          .limit(1);
        if (!row || row.customerId !== session.userId) return json({ error: "Not found" }, 404);
        if (
          !canTransitionPurchaseRequest({
            actor: { userId: session.userId, role: session.role },
            customerId: row.customerId,
            from: row.status as PurchaseRequestStatus,
            to: body.status,
          })
        ) {
          return json({ error: "Forbidden" }, 403);
        }
        await db
          .update(schema.purchaseRequests)
          .set({ status: "cancelled", updatedAt: new Date().toISOString() })
          .where(eq(schema.purchaseRequests.id, body.id));
        return json({ ok: true });
      },
    },
  },
});
