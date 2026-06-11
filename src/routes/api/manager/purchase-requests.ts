import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import {
  PURCHASE_REQUEST_STATUSES,
  canTransitionPurchaseRequest,
  type PurchaseRequestStatus,
} from "@/lib/crm";
import { parseRequestBody } from "@/lib/request-utils";
import { requireManagerSession, json } from "@/server/crm";
import { db, schema } from "@/server/db";

const statusSchema = z.enum(PURCHASE_REQUEST_STATUSES);

export const Route = createFileRoute("/api/manager/purchase-requests")({
  server: {
    handlers: {
      GET: async () => {
        await requireManagerSession();
        const requests = await db
          .select({
            id: schema.purchaseRequests.id,
            customerId: schema.purchaseRequests.customerId,
            customerName: schema.users.displayName,
            customerEmail: schema.users.email,
            planId: schema.purchaseRequests.planId,
            serviceOfferingId: schema.purchaseRequests.serviceOfferingId,
            preferredPtId: schema.purchaseRequests.preferredPtId,
            status: schema.purchaseRequests.status,
            message: schema.purchaseRequests.message,
            contactPhone: schema.purchaseRequests.contactPhone,
            requestedStartDate: schema.purchaseRequests.requestedStartDate,
            createdAt: schema.purchaseRequests.createdAt,
            updatedAt: schema.purchaseRequests.updatedAt,
          })
          .from(schema.purchaseRequests)
          .innerJoin(schema.users, eq(schema.purchaseRequests.customerId, schema.users.id))
          .orderBy(desc(schema.purchaseRequests.updatedAt))
          .limit(300);
        return json({ requests });
      },
      PATCH: async (ctx: unknown) => {
        const session = await requireManagerSession();
        const maybe = ctx as { request?: Request };
        const request = maybe.request ?? (ctx as Request);
        const body = z
          .object({ id: z.string().min(1), status: statusSchema })
          .parse(await parseRequestBody(request));
        const [row] = await db
          .select()
          .from(schema.purchaseRequests)
          .where(eq(schema.purchaseRequests.id, body.id))
          .limit(1);
        if (!row) return json({ error: "Purchase request not found" }, 404);
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
          .set({
            status: body.status,
            handledBy: session.userId,
            handledAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.purchaseRequests.id, body.id));
        return json({ ok: true });
      },
    },
  },
});
