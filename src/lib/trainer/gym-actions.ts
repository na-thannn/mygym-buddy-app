import { and, eq, sql } from "drizzle-orm";
import type { Actor } from "@/lib/roles";
import { canBookGroupClassSession } from "@/lib/group-classes";
import { isIntervalBlockedByPtUnavailability } from "@/lib/pt-availability";
import { db, schema } from "@/server/db";
import { newId } from "@/server/auth";

type AlexActionResult = {
  ok: boolean;
  id?: string;
  error?: string;
};

type CreatePackageRequestInput = {
  actor: Actor;
  planId?: string | null;
  serviceOfferingId?: string | null;
  preferredPtId?: string | null;
  message?: string;
  contactPhone?: string;
  requestedStartDate?: string | null;
};

type RequestPtSessionInput = {
  actor: Actor;
  ptId?: string | null;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string | null;
};

type BookGroupClassInput = {
  actor: Actor;
  sessionId: string;
};

type CancelGroupClassBookingInput = {
  actor: Actor;
  bookingId: string;
};

export async function createPackageRequestFromAlex({
  actor,
  planId,
  serviceOfferingId,
  preferredPtId,
  message = "",
  contactPhone = "",
  requestedStartDate = null,
}: CreatePackageRequestInput): Promise<AlexActionResult> {
  if (!isCustomer(actor)) return customerOnly();
  if (!planId && !serviceOfferingId) return { ok: false, error: "Choose a plan or service" };

  if (planId) {
    const [plan] = await db
      .select({ id: schema.membershipPlans.id })
      .from(schema.membershipPlans)
      .where(
        and(
          eq(schema.membershipPlans.id, planId),
          eq(schema.membershipPlans.active, 1),
          eq(schema.membershipPlans.isPublic, 1),
        ),
      )
      .limit(1);
    if (!plan) return { ok: false, error: "Plan not available" };
  }

  if (serviceOfferingId) {
    const [service] = await db
      .select({ id: schema.serviceOfferings.id })
      .from(schema.serviceOfferings)
      .where(
        and(
          eq(schema.serviceOfferings.id, serviceOfferingId),
          eq(schema.serviceOfferings.active, 1),
          eq(schema.serviceOfferings.isPublic, 1),
        ),
      )
      .limit(1);
    if (!service) return { ok: false, error: "Service not available" };
  }

  if (preferredPtId) {
    const [pt] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .innerJoin(schema.ptProfiles, eq(schema.users.id, schema.ptProfiles.userId))
      .where(
        and(
          eq(schema.users.id, preferredPtId),
          eq(schema.users.role, "pt"),
          eq(schema.ptProfiles.isPublic, 1),
        ),
      )
      .limit(1);
    if (!pt) return { ok: false, error: "PT not available" };
  }

  const id = newId();
  await db.insert(schema.purchaseRequests).values({
    id,
    customerId: actor.userId,
    planId: planId ?? null,
    serviceOfferingId: serviceOfferingId ?? null,
    preferredPtId: preferredPtId ?? null,
    message,
    contactPhone,
    requestedStartDate: requestedStartDate ?? null,
    source: "ai_chat",
  });
  return { ok: true, id };
}

export async function requestPtSessionFromAlex({
  actor,
  ptId,
  scheduledAt,
  durationMinutes = 60,
  notes = null,
}: RequestPtSessionInput): Promise<AlexActionResult> {
  if (!isCustomer(actor)) return customerOnly();

  const [customer] = await db
    .select({ id: schema.users.id, assignedPtId: schema.users.assignedPtId })
    .from(schema.users)
    .where(and(eq(schema.users.id, actor.userId), eq(schema.users.role, "customer")))
    .limit(1);
  if (!customer) return { ok: false, error: "Customer not found" };

  const resolvedPtId = ptId || customer.assignedPtId;
  if (!resolvedPtId) return { ok: false, error: "PT not assigned" };

  const [pt] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(and(eq(schema.users.id, resolvedPtId), eq(schema.users.role, "pt")))
    .limit(1);
  if (!pt) return { ok: false, error: "PT not found" };

  if (await isPtUnavailableForSchedule(resolvedPtId, scheduledAt, durationMinutes)) {
    return { ok: false, error: "PT is unavailable for that time" };
  }

  const id = newId();
  await db.insert(schema.bookings).values({
    id,
    customerId: actor.userId,
    ptId: resolvedPtId,
    scheduledAt,
    durationMinutes,
    notes,
  });
  return { ok: true, id };
}

export async function bookGroupClassFromAlex({
  actor,
  sessionId,
}: BookGroupClassInput): Promise<AlexActionResult> {
  if (!isCustomer(actor)) return customerOnly();

  const [classSession] = await db
    .select({
      id: schema.groupClassSessions.id,
      capacity: schema.groupClassSessions.capacity,
      status: schema.groupClassSessions.status,
      classActive: schema.groupClasses.active,
    })
    .from(schema.groupClassSessions)
    .innerJoin(schema.groupClasses, eq(schema.groupClassSessions.classId, schema.groupClasses.id))
    .where(eq(schema.groupClassSessions.id, sessionId))
    .limit(1);
  if (!classSession || classSession.classActive !== 1) {
    return { ok: false, error: "Class is full or unavailable" };
  }

  const [bookedRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.groupClassBookings)
    .where(
      and(
        eq(schema.groupClassBookings.sessionId, sessionId),
        eq(schema.groupClassBookings.status, "booked"),
      ),
    )
    .limit(1);
  const [existing] = await db
    .select()
    .from(schema.groupClassBookings)
    .where(
      and(
        eq(schema.groupClassBookings.sessionId, sessionId),
        eq(schema.groupClassBookings.customerId, actor.userId),
      ),
    )
    .limit(1);

  if (existing?.status === "booked") return { ok: false, error: "Class is already booked" };

  if (
    !canBookGroupClassSession({
      capacity: classSession.capacity,
      bookedCount: Number(bookedRow?.count ?? 0),
      alreadyBooked: false,
      status: classSession.status,
    })
  ) {
    return { ok: false, error: "Class is full or unavailable" };
  }

  if (existing) {
    await db
      .update(schema.groupClassBookings)
      .set({ status: "booked", attendedAt: null, updatedAt: new Date().toISOString() })
      .where(eq(schema.groupClassBookings.id, existing.id));
    return { ok: true, id: existing.id };
  }

  const id = newId();
  await db.insert(schema.groupClassBookings).values({
    id,
    sessionId,
    customerId: actor.userId,
  });
  return { ok: true, id };
}

export async function cancelGroupClassBookingFromAlex({
  actor,
  bookingId,
}: CancelGroupClassBookingInput): Promise<AlexActionResult> {
  if (!isCustomer(actor)) return customerOnly();

  const [booking] = await db
    .select()
    .from(schema.groupClassBookings)
    .where(eq(schema.groupClassBookings.id, bookingId))
    .limit(1);
  if (!booking || booking.customerId !== actor.userId) {
    return { ok: false, error: "Class booking not found" };
  }

  await db
    .update(schema.groupClassBookings)
    .set({ status: "cancelled", attendedAt: null, updatedAt: new Date().toISOString() })
    .where(eq(schema.groupClassBookings.id, bookingId));
  return { ok: true, id: bookingId };
}

function isCustomer(actor: Actor) {
  return actor.role === "customer";
}

function customerOnly(): AlexActionResult {
  return { ok: false, error: "Only customers can use this action" };
}

async function isPtUnavailableForSchedule(
  ptId: string,
  startsAt: string,
  durationMinutes: number,
): Promise<boolean> {
  const blocks = await db
    .select()
    .from(schema.ptUnavailabilityBlocks)
    .where(eq(schema.ptUnavailabilityBlocks.ptId, ptId));
  return isIntervalBlockedByPtUnavailability({ ptId, startsAt, durationMinutes, blocks });
}
