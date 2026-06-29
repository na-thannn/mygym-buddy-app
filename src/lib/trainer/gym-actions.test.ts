import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCleanDatabase } from "@/test/use-clean-database";

useCleanDatabase();

const customerActor = { userId: "customer-1", role: "customer" } as const;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.resetModules();
});

async function seedActionData() {
  const { db, schema } = await import("@/server/db");

  await db.insert(schema.users).values([
    {
      id: "customer-1",
      email: "customer@example.com",
      passwordHash: "hash",
      displayName: "Customer One",
      role: "customer",
      assignedPtId: "pt-1",
    },
    {
      id: "other-customer",
      email: "other@example.com",
      passwordHash: "hash",
      displayName: "Other Customer",
      role: "customer",
    },
    {
      id: "pt-1",
      email: "pt@example.com",
      passwordHash: "hash",
      displayName: "Coach Linh",
      role: "pt",
    },
    {
      id: "manager-1",
      email: "manager@example.com",
      passwordHash: "hash",
      displayName: "Manager One",
      role: "manager",
    },
  ]);

  await db.insert(schema.membershipPlans).values([
    {
      id: "standard-monthly",
      nameEn: "Standard Monthly",
      nameVi: "Goi thang tieu chuan",
      descriptionEn: "Monthly access",
      descriptionVi: "Tap hang thang",
      audience: "general",
      priceVnd: 200000,
      durationDays: 30,
      active: 1,
      isPublic: 1,
    },
    {
      id: "private-plan",
      nameEn: "Private Plan",
      nameVi: "Goi rieng",
      descriptionEn: "Hidden",
      descriptionVi: "An",
      audience: "private",
      priceVnd: 1,
      durationDays: 30,
      active: 1,
      isPublic: 0,
    },
  ]);

  await db.insert(schema.serviceOfferings).values({
    id: "pt-one-one-service",
    nameEn: "PT 1-1 Coaching",
    nameVi: "PT 1-1",
    descriptionEn: "Personal coaching",
    descriptionVi: "Tap kem rieng",
    category: "training",
    priceVnd: 2500000,
    durationMinutes: 60,
    active: 1,
    isPublic: 1,
  });

  await db.insert(schema.ptProfiles).values({
    userId: "pt-1",
    bioEn: "Strength coach",
    bioVi: "HLV suc manh",
    specialtiesEn: "Strength",
    specialtiesVi: "Suc manh",
    yearsExperience: 5,
    isPublic: 1,
  });

  await db.insert(schema.groupClasses).values({
    id: "yoga-flow",
    title: "Yoga Flow",
    description: "Mobility class",
    level: "Beginner",
    active: 1,
  });

  await db.insert(schema.groupClassSessions).values([
    {
      id: "session-open",
      classId: "yoga-flow",
      trainerId: "pt-1",
      startsAt: "2026-06-16T11:00:00.000Z",
      durationMinutes: 60,
      capacity: 2,
      status: "scheduled",
    },
    {
      id: "session-full",
      classId: "yoga-flow",
      trainerId: "pt-1",
      startsAt: "2026-06-17T11:00:00.000Z",
      durationMinutes: 60,
      capacity: 1,
      status: "scheduled",
    },
  ]);

  await db.insert(schema.groupClassBookings).values([
    {
      id: "full-booking",
      sessionId: "session-full",
      customerId: "other-customer",
      status: "booked",
    },
    {
      id: "existing-booking",
      sessionId: "session-open",
      customerId: "other-customer",
      status: "booked",
    },
  ]);

  await db.insert(schema.ptUnavailabilityBlocks).values({
    id: "unavailable-1",
    ptId: "pt-1",
    unavailableDate: "2026-06-18",
    allDay: 1,
  });
}

describe("Alex gym actions", () => {
  it("creates package requests only for public active catalog items", async () => {
    await seedActionData();
    const { db, schema } = await import("@/server/db");
    const { createPackageRequestFromAlex } = await import("./gym-actions");

    const created = await createPackageRequestFromAlex({
      actor: customerActor,
      planId: "standard-monthly",
      message: "I want to start next week",
      contactPhone: "0909 123 456",
      requestedStartDate: "2026-06-20",
    });
    const rejected = await createPackageRequestFromAlex({
      actor: customerActor,
      planId: "private-plan",
      message: "Can I buy this?",
    });

    const rows = await db.select().from(schema.purchaseRequests);
    expect(created.ok).toBe(true);
    expect(created.id).toBe(rows[0]?.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      customerId: "customer-1",
      planId: "standard-monthly",
      message: "I want to start next week",
      contactPhone: "0909 123 456",
      requestedStartDate: "2026-06-20",
      source: "ai_chat",
    });
    expect(rejected).toMatchObject({ ok: false, error: "Plan not available" });
  });

  it("requests PT sessions and rejects unavailable PT intervals", async () => {
    await seedActionData();
    const { db, schema } = await import("@/server/db");
    const { requestPtSessionFromAlex } = await import("./gym-actions");

    const created = await requestPtSessionFromAlex({
      actor: customerActor,
      ptId: "pt-1",
      scheduledAt: "2026-06-19T09:00:00.000Z",
      durationMinutes: 60,
      notes: "Technique check",
    });
    const rejected = await requestPtSessionFromAlex({
      actor: customerActor,
      ptId: "pt-1",
      scheduledAt: "2026-06-18T09:00:00.000Z",
      durationMinutes: 60,
      notes: "Unavailable day",
    });

    const rows = await db.select().from(schema.bookings);
    expect(created.ok).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      customerId: "customer-1",
      ptId: "pt-1",
      scheduledAt: "2026-06-19T09:00:00.000Z",
      durationMinutes: 60,
      notes: "Technique check",
      status: "pending",
    });
    expect(rejected).toMatchObject({
      ok: false,
      error: "PT is unavailable for that time",
    });
  });

  it("books available group classes and rejects full or duplicate bookings", async () => {
    await seedActionData();
    const { bookGroupClassFromAlex } = await import("./gym-actions");

    const booked = await bookGroupClassFromAlex({
      actor: customerActor,
      sessionId: "session-open",
    });
    const duplicate = await bookGroupClassFromAlex({
      actor: customerActor,
      sessionId: "session-open",
    });
    const full = await bookGroupClassFromAlex({
      actor: customerActor,
      sessionId: "session-full",
    });

    expect(booked).toMatchObject({ ok: true, id: expect.any(String) });
    expect(duplicate).toMatchObject({ ok: false, error: "Class is already booked" });
    expect(full).toMatchObject({ ok: false, error: "Class is full or unavailable" });
  });

  it("cancels only the customer owned class booking", async () => {
    await seedActionData();
    const { db, schema } = await import("@/server/db");
    const { bookGroupClassFromAlex, cancelGroupClassBookingFromAlex } = await import("./gym-actions");

    const booked = await bookGroupClassFromAlex({
      actor: customerActor,
      sessionId: "session-open",
    });
    const cancelled = await cancelGroupClassBookingFromAlex({
      actor: customerActor,
      bookingId: booked.id ?? "",
    });
    const rejected = await cancelGroupClassBookingFromAlex({
      actor: customerActor,
      bookingId: "existing-booking",
    });

    const rows = await db.select().from(schema.groupClassBookings);
    const own = rows.find((row) => row.id === booked.id);
    const other = rows.find((row) => row.id === "existing-booking");
    expect(cancelled).toMatchObject({ ok: true });
    expect(own?.status).toBe("cancelled");
    expect(rejected).toMatchObject({ ok: false, error: "Class booking not found" });
    expect(other?.status).toBe("booked");
  });
});
