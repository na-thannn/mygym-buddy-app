import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCleanDatabase } from "@/test/use-clean-database";

useCleanDatabase();

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.resetModules();
});

async function seedGymKnowledge() {
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
      email: "linh@example.com",
      passwordHash: "hash",
      displayName: "Coach Linh",
      role: "pt",
    },
    {
      id: "private-pt",
      email: "private@example.com",
      passwordHash: "hash",
      displayName: "Private Coach",
      role: "pt",
    },
  ]);

  await db.insert(schema.branches).values({
    id: "branch-1",
    nameEn: "HL Fitness",
    nameVi: "HL Fitness",
    addressEn: "303 Le Thanh Nghi",
    addressVi: "303 Le Thanh Nghi",
    phone: "0909 000 111",
    hoursEn: "6:00-22:00 daily",
    hoursVi: "6:00-22:00 hang ngay",
    mapUrl: "https://maps.example/hl",
    facebookUrl: "https://facebook.example/hl",
  });

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
      bonusDays: 0,
      includesPtSessions: 0,
      active: 1,
      isPublic: 1,
      sortOrder: 1,
    },
    {
      id: "private-annual",
      nameEn: "Private Annual",
      nameVi: "Goi rieng",
      descriptionEn: "Hidden plan",
      descriptionVi: "Goi an",
      audience: "private",
      priceVnd: 1000000,
      durationDays: 365,
      bonusDays: 0,
      includesPtSessions: 0,
      active: 1,
      isPublic: 0,
      sortOrder: 2,
    },
  ]);

  await db.insert(schema.serviceOfferings).values([
    {
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
      sortOrder: 1,
    },
    {
      id: "private-service",
      nameEn: "Private Service",
      nameVi: "Dich vu rieng",
      descriptionEn: "Hidden service",
      descriptionVi: "Dich vu an",
      category: "training",
      priceVnd: 1,
      durationMinutes: 60,
      active: 1,
      isPublic: 0,
      sortOrder: 2,
    },
  ]);

  await db.insert(schema.ptProfiles).values([
    {
      userId: "pt-1",
      bioEn: "Strength and body composition coach",
      bioVi: "HLV suc manh",
      specialtiesEn: "Strength, fat loss",
      specialtiesVi: "Suc manh, giam mo",
      yearsExperience: 5,
      isPublic: 1,
    },
    {
      userId: "private-pt",
      bioEn: "Private profile",
      bioVi: "Ho so rieng",
      specialtiesEn: "Hidden",
      specialtiesVi: "An",
      yearsExperience: 9,
      isPublic: 0,
    },
  ]);

  await db.insert(schema.ptServiceOfferings).values([
    { ptId: "pt-1", serviceOfferingId: "pt-one-one-service", active: 1 },
    { ptId: "private-pt", serviceOfferingId: "pt-one-one-service", active: 1 },
    { ptId: "pt-1", serviceOfferingId: "private-service", active: 1 },
  ]);

  await db.insert(schema.promotions).values([
    {
      id: "promo-3-plus-1",
      titleEn: "Pay 3 months, get 1 month",
      titleVi: "Dong 3 thang tang 1 thang",
      bodyEn: "Bonus membership month.",
      bodyVi: "Tang them thang tap.",
      bonusTermsEn: "Pay 3 months and receive 1 bonus month.",
      bonusTermsVi: "Dong 3 thang tang 1 thang.",
      active: 1,
      isPublic: 1,
      sortOrder: 1,
    },
    {
      id: "inactive-promo",
      titleEn: "Inactive Promo",
      titleVi: "Uu dai an",
      bodyEn: "Hidden promo",
      bodyVi: "Uu dai an",
      bonusTermsEn: "Hidden terms",
      bonusTermsVi: "Dieu kien an",
      active: 0,
      isPublic: 1,
      sortOrder: 2,
    },
  ]);

  await db.insert(schema.publicEvents).values([
    {
      id: "body-comp-workshop",
      titleEn: "Body Composition Workshop",
      titleVi: "Workshop InBody",
      descriptionEn: "Learn how to read InBody reports.",
      descriptionVi: "Doc ket qua InBody.",
      eventType: "workshop",
      startsAt: "2026-06-20T09:00:00.000Z",
      active: 1,
      isPublic: 1,
      sortOrder: 1,
    },
    {
      id: "private-event",
      titleEn: "Private Event",
      titleVi: "Su kien rieng",
      descriptionEn: "Hidden event",
      descriptionVi: "Su kien an",
      eventType: "staff",
      active: 1,
      isPublic: 0,
      sortOrder: 2,
    },
  ]);

  await db.insert(schema.groupClasses).values([
    {
      id: "yoga-flow",
      title: "Yoga Flow",
      description: "Mobility and recovery class",
      level: "Beginner",
      active: 1,
    },
    {
      id: "full-class",
      title: "Full HIIT",
      description: "No seats left",
      level: "Intermediate",
      active: 1,
    },
    {
      id: "cancelled-class",
      title: "Cancelled Boxing",
      description: "Cancelled session",
      active: 1,
    },
  ]);

  await db.insert(schema.groupClassSessions).values([
    {
      id: "session-yoga",
      classId: "yoga-flow",
      trainerId: "pt-1",
      startsAt: "2026-06-16T11:00:00.000Z",
      durationMinutes: 60,
      capacity: 4,
      status: "scheduled",
    },
    {
      id: "session-past",
      classId: "yoga-flow",
      trainerId: "pt-1",
      startsAt: "2026-06-01T11:00:00.000Z",
      durationMinutes: 60,
      capacity: 3,
      status: "scheduled",
    },
    {
      id: "session-full",
      classId: "full-class",
      trainerId: "pt-1",
      startsAt: "2026-06-17T11:00:00.000Z",
      durationMinutes: 45,
      capacity: 1,
      status: "scheduled",
    },
    {
      id: "session-cancelled",
      classId: "cancelled-class",
      trainerId: "pt-1",
      startsAt: "2026-06-18T11:00:00.000Z",
      durationMinutes: 45,
      capacity: 5,
      status: "cancelled",
    },
  ]);

  await db.insert(schema.groupClassBookings).values([
    {
      id: "other-yoga-booking",
      sessionId: "session-yoga",
      customerId: "other-customer",
      status: "booked",
    },
    {
      id: "full-booking",
      sessionId: "session-full",
      customerId: "other-customer",
      status: "booked",
    },
    {
      id: "my-class-booking",
      sessionId: "session-yoga",
      customerId: "customer-1",
      status: "booked",
    },
  ]);

  await db.insert(schema.memberships).values({
    id: "membership-1",
    customerId: "customer-1",
    planId: "standard-monthly",
    status: "active",
    startsOn: "2026-06-01",
    endsOn: "2026-07-01",
    priceVndAtPurchase: 200000,
    assignedPtId: "pt-1",
  });

  await db.insert(schema.purchaseRequests).values({
    id: "request-1",
    customerId: "customer-1",
    planId: "standard-monthly",
    status: "requested",
    message: "Interested in renewing",
  });

  await db.insert(schema.bookings).values({
    id: "booking-1",
    customerId: "customer-1",
    ptId: "pt-1",
    scheduledAt: "2026-06-19T09:00:00.000Z",
    durationMinutes: 60,
    status: "confirmed",
    notes: "Technique check",
  });
}

describe("Alex gym knowledge", () => {
  it("builds DB-backed gym knowledge and excludes unavailable catalog records", async () => {
    await seedGymKnowledge();
    const { buildGymKnowledge } = await import("./gym-knowledge");

    const knowledge = await buildGymKnowledge({
      userId: "customer-1",
      now: new Date("2026-06-15T02:00:00.000Z"),
    });

    expect(knowledge.text).toContain("HL Fitness equipment layout");
    expect(knowledge.text).toContain("Floor 2");
    expect(knowledge.text).toContain("303 Le Thanh Nghi");
    expect(knowledge.text).toContain("0909 000 111");
    expect(knowledge.text).toContain("Standard Monthly");
    expect(knowledge.text).toContain("200,000 VND");
    expect(knowledge.text).toContain("PT 1-1 Coaching");
    expect(knowledge.text).toContain("Pay 3 months, get 1 month");
    expect(knowledge.text).toContain("Body Composition Workshop");
    expect(knowledge.text).toContain("Coach Linh");
    expect(knowledge.text).toContain("Strength, fat loss");
    expect(knowledge.text).toContain("Yoga Flow");
    expect(knowledge.text).toContain("2 seats left");
    expect(knowledge.text).toContain("Membership active");
    expect(knowledge.text).toContain("Interested in renewing");
    expect(knowledge.text).toContain("Upcoming PT bookings");
    expect(knowledge.text).toContain("Technique check");
    expect(knowledge.text).toContain("My class bookings");

    expect(knowledge.text).not.toContain("Private Annual");
    expect(knowledge.text).not.toContain("Private Service");
    expect(knowledge.text).not.toContain("Private Coach");
    expect(knowledge.text).not.toContain("Inactive Promo");
    expect(knowledge.text).not.toContain("Private Event");
    expect(knowledge.text).not.toContain("Full HIIT");
    expect(knowledge.text).not.toContain("Cancelled Boxing");
    expect(knowledge.text).not.toContain("2026-06-01T11:00:00.000Z");
  });
});
