import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { and, desc, eq, type SQL } from "drizzle-orm";

async function requireSession() {
  const { readSessionCookie, validateSessionToken } = await import("@/server/auth");
  const token = readSessionCookie();
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const session = await validateSessionToken(token);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return session;
}

const createInput = z.object({
  scheduledAt: z.string().min(1), // ISO datetime string
  durationMinutes: z.number().int().min(15).max(1440).optional().default(60),
  notes: z.string().max(1000).optional(),
  ptId: z.string().optional().nullable(),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createInput.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const { newId } = await import("@/server/auth");
    // customers and admins can create bookings
    if (!["customer", "admin", "manager", "pt"].includes(session.role)) {
      throw new Response("Forbidden", { status: 403 });
    }
    const id = newId();
    await db
      .insert(schema.bookings)
      .values({
        id,
        customerId: session.userId,
        ptId: data.ptId ?? null,
        scheduledAt: data.scheduledAt,
        durationMinutes: data.durationMinutes ?? 60,
        notes: data.notes ?? null,
      });
    return { ok: true, id };
  });

export const listBookings = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) =>
    z
      .object({
        forUserId: z.string().optional(),
        forPtId: z.string().optional(),
        status: z.string().optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const where: SQL[] = [];
    // role-based defaults
    if (session.role === "customer") where.push(eq(schema.bookings.customerId, session.userId));
    else if (session.role === "pt") where.push(eq(schema.bookings.ptId, session.userId));
    else if (session.role === "manager") {
      // Managers can see operational bookings.
    }
    // optional filters (admin can pass filters)
    if (data.forUserId) where.push(eq(schema.bookings.customerId, data.forUserId));
    if (data.forPtId) where.push(eq(schema.bookings.ptId, data.forPtId));
    if (data.status) where.push(eq(schema.bookings.status, data.status));

    if (where.length) {
      return await db
        .select()
        .from(schema.bookings)
        .where(and(...where))
        .orderBy(desc(schema.bookings.scheduledAt))
        .limit(data.limit);
    }
    return await db
      .select()
      .from(schema.bookings)
      .orderBy(desc(schema.bookings.scheduledAt))
      .limit(data.limit);
  });

const updateInput = z.object({
  id: z.string().min(1),
  action: z.enum(["accept", "decline", "cancel", "reschedule", "complete"]),
  scheduledAt: z.string().optional(),
  durationMinutes: z.number().int().optional(),
  cancellationReason: z.string().optional().nullable(),
});

export const updateBooking = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => updateInput.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const id = data.id;
    const [existing] = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, id))
      .limit(1);
    if (!existing) throw new Response("Not found", { status: 404 });

    // Permission checks
    if (session.role === "customer" && existing.customerId !== session.userId) {
      throw new Response("Forbidden", { status: 403 });
    }
    if (session.role === "pt" && existing.ptId !== session.userId) {
      throw new Response("Forbidden", { status: 403 });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (data.action === "accept") {
      if (!["pt", "admin", "manager"].includes(session.role))
        throw new Response("Forbidden", { status: 403 });
      updates.status = "confirmed";
    } else if (data.action === "decline") {
      if (!["pt", "admin", "manager"].includes(session.role))
        throw new Response("Forbidden", { status: 403 });
      updates.status = "declined";
      updates.cancelledBy = session.userId;
      updates.cancellationReason = data.cancellationReason ?? null;
    } else if (data.action === "cancel") {
      // customer or admin or pt can cancel (if pt assigned)
      if (session.role === "customer") updates.cancelledBy = session.userId;
      else updates.cancelledBy = session.userId;
      updates.status = "cancelled";
      updates.cancellationReason = data.cancellationReason ?? null;
    } else if (data.action === "reschedule") {
      if (!data.scheduledAt)
        throw new Response("scheduledAt required for reschedule", { status: 400 });
      updates.scheduledAt = data.scheduledAt;
      if (data.durationMinutes) updates.durationMinutes = data.durationMinutes;
      updates.status = "rescheduled";
    } else if (data.action === "complete") {
      updates.status = "completed";
    }

    await db.update(schema.bookings).set(updates).where(eq(schema.bookings.id, id));
    return { ok: true };
  });

export default {};
