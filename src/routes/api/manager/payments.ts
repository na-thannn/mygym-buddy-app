import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { desc } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import { requireManagerSession, json } from "@/server/crm";
import { db, schema } from "@/server/db";
import { newId } from "@/server/auth";

const paymentSchema = z.object({
  customerId: z.string().min(1),
  membershipId: z.string().nullable().optional(),
  purchaseRequestId: z.string().nullable().optional(),
  amountVnd: z.number().int().min(0),
  method: z.string().trim().min(1).max(80).default("cash"),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().nullable().optional(),
});

export const Route = createFileRoute("/api/manager/payments")({
  server: {
    handlers: {
      GET: async () => {
        await requireManagerSession();
        const payments = await db
          .select()
          .from(schema.manualPayments)
          .orderBy(desc(schema.manualPayments.createdAt))
          .limit(500);
        return json({ payments });
      },
      POST: async (ctx: unknown) => {
        const session = await requireManagerSession();
        const maybe = ctx as { request?: Request };
        const request = maybe.request ?? (ctx as Request);
        const parsed = paymentSchema.safeParse(await parseRequestBody(request as unknown));
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
        const id = newId();
        await db.insert(schema.manualPayments).values({
          id,
          ...parsed.data,
          membershipId: parsed.data.membershipId ?? null,
          purchaseRequestId: parsed.data.purchaseRequestId ?? null,
          recordedBy: session.userId,
          status: "recorded",
        });
        return json({ ok: true, id }, 201);
      },
    },
  },
});
