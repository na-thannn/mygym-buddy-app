import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.resetModules();
});

async function seedMemberContext() {
  const { db, schema } = await import("@/server/db");

  await db
    .insert(schema.users)
    .values([
      {
        id: "user-1",
        email: "member@example.com",
        passwordHash: "hash",
        displayName: "Member One",
      },
      {
        id: "user-2",
        email: "other@example.com",
        passwordHash: "hash",
        displayName: "Other Member",
      },
    ]);

  await db
    .insert(schema.profiles)
    .values({
      userId: "user-1",
      goal: "Build strength",
      level: "Intermediate",
      limitations: "Previous shoulder irritation",
      age: 28,
      gender: "male",
      heightCm: 178,
      weightKg: 82,
      targetWeightKg: 85,
      updatedAt: "2026-06-03T08:00:00.000Z",
    });

  await db
    .insert(schema.workoutLogs)
    .values([
      {
        id: "workout-1",
        userId: "user-1",
        performedAt: "2026-06-02",
        exercise: "Back squat",
        sets: 4,
        reps: "6",
        weightKg: 120,
      },
      {
        id: "workout-old",
        userId: "user-1",
        performedAt: "2026-05-01",
        exercise: "Old deadlift",
        sets: 3,
        reps: "5",
        weightKg: 140,
      },
      {
        id: "workout-other",
        userId: "user-2",
        performedAt: "2026-06-02",
        exercise: "Other user squat",
        sets: 5,
        reps: "5",
        weightKg: 100,
      },
    ]);

  await db
    .insert(schema.nutritionReports)
    .values({
      id: "nutrition-1",
      userId: "user-1",
      reportDate: "2026-06-01",
      breakfast: "oats and eggs",
      lunch: "rice and chicken",
      dinner: "salmon",
      calories: 2400,
      proteinG: 180,
    });

  await db
    .insert(schema.inbodyReports)
    .values({
      id: "inbody-1",
      userId: "user-1",
      reportDate: "2026-05-30",
      weightKg: 82,
      muscleMassKg: 36,
      bodyFatPercent: 16,
    });

  await db
    .insert(schema.workoutPlanDocs)
    .values({
      id: "plan-1",
      userId: "user-1",
      planDate: "2026-06-03",
      title: "Strength block",
      contentMd: "Heavy lower, push pull split",
    });

  await db
    .insert(schema.analyses)
    .values({
      id: "analysis-1",
      userId: "user-1",
      planDate: "2026-06-03",
      contentMd: "Squat consistency is improving.",
    });

  await db.insert(schema.membershipPlans).values({
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
  });

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

  await db.insert(schema.promotions).values({
    id: "promo-3-plus-1",
    titleEn: "Pay 3 months, get 1 month",
    titleVi: "Dong 3 thang tang 1 thang",
    bonusTermsEn: "Pay 3 months and receive 1 bonus month.",
    bonusTermsVi: "Dong 3 thang tang 1 thang.",
    active: 1,
    isPublic: 1,
  });

  await db.insert(schema.memberships).values({
    id: "membership-1",
    customerId: "user-1",
    planId: "standard-monthly",
    status: "active",
    startsOn: "2026-06-01",
    endsOn: "2026-07-01",
    priceVndAtPurchase: 200000,
  });

  await db.insert(schema.purchaseRequests).values({
    id: "request-1",
    customerId: "user-1",
    planId: "standard-monthly",
    status: "requested",
    message: "Interested in renewing",
  });
}

describe("trainer context builder", () => {
  it("builds a compact user-scoped context from recent member records", async () => {
    await seedMemberContext();
    const { buildTrainerContext } = await import("./context");

    const context = await buildTrainerContext({
      userId: "user-1",
      now: new Date("2026-06-04T12:00:00.000Z"),
      days: 14,
    });

    expect(context.days).toBe(14);
    expect(context.text).toContain("Goal: Build strength");
    expect(context.text).toContain("Limitations: Previous shoulder irritation");
    expect(context.text).toContain("Back squat");
    expect(context.text).toContain("rice and chicken");
    expect(context.text).toContain("InBody");
    expect(context.text).toContain("Strength block");
    expect(context.text).toContain("Squat consistency is improving");
    expect(context.text).toContain("Membership active");
    expect(context.text).toContain("Standard Monthly");
    expect(context.text).toContain("200,000 VND");
    expect(context.text).toContain("PT 1-1 Coaching");
    expect(context.text).toContain("Pay 3 months");
    expect(context.text).toContain("Interested in renewing");
    expect(context.text).not.toContain("Other user squat");
    expect(context.text).not.toContain("Old deadlift");
    expect(context.text.length).toBeLessThan(6000);
  });
});
