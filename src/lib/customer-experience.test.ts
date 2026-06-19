import { describe, expect, test } from "vitest";
import {
  buildClassDiscovery,
  buildInbodyExperience,
  buildNutritionExperience,
  buildBookingExperience,
  buildProfileSetupSummary,
  buildProgressExperience,
  buildTodayChecklist,
  buildWorkoutQuickActions,
  buildWeeklyCheckIn,
  buildWeeklyStreak,
  getTrainerPromptFromSearch,
  selectActivePlan,
  getCustomerNavLabel,
  getNextCustomerEvent,
} from "@/lib/customer-experience";

describe("customer experience helpers", () => {
  test("renames technical customer nav labels into daily member language", () => {
    expect(getCustomerNavLabel("customer", "/feed", "Feed")).toBe("Today");
    expect(getCustomerNavLabel("customer", "/log/workout", "Workout")).toBe("Train");
    expect(getCustomerNavLabel("customer", "/trainer", "AI Coach")).toBe("Coach");
    expect(getCustomerNavLabel("customer", "/analyses", "AI Analyses")).toBe("Coach Reviews");
  });

  test("keeps non-customer nav labels unchanged", () => {
    expect(getCustomerNavLabel("admin", "/feed", "Feed")).toBe("Feed");
    expect(getCustomerNavLabel("pt", "/trainer", "AI Coach")).toBe("AI Coach");
  });

  test("builds a today checklist from existing member records", () => {
    const checklist = buildTodayChecklist({
      today: "2026-06-04",
      workouts: [{ performedAt: "2026-06-04" }],
      latestNutritionDate: "2026-06-03",
      latestInbodyDate: "2026-05-28",
    });

    expect(checklist).toEqual([
      expect.objectContaining({
        id: "workout",
        complete: true,
        status: "Logged today",
        href: "/log/workout",
      }),
      expect.objectContaining({
        id: "nutrition",
        complete: false,
        status: "Not logged today",
        href: "/nutrition",
      }),
      expect.objectContaining({
        id: "inbody",
        complete: true,
        status: "Updated recently",
        href: "/inbody",
      }),
    ]);
  });

  test("selects the soonest upcoming booking or class", () => {
    const next = getNextCustomerEvent({
      nowIso: "2026-06-04T09:00:00.000Z",
      bookings: [
        {
          scheduledAt: "2026-06-06T10:00:00.000Z",
          status: "pending",
          durationMinutes: 60,
        },
      ],
      classes: [
        {
          title: "Strength Foundations",
          startsAt: "2026-06-05T08:00:00.000Z",
          durationMinutes: 45,
          myBooking: { status: "booked" },
        },
      ],
    });

    expect(next).toEqual({
      kind: "class",
      title: "Strength Foundations",
      startsAt: "2026-06-05T08:00:00.000Z",
      status: "booked",
      href: "/classes",
      durationMinutes: 45,
    });
  });

  test("summarizes profile setup progress for Alex coaching context", () => {
    const summary = buildProfileSetupSummary({
      goal: "Build muscle",
      level: "Intermediate",
      age: "24",
      gender: "",
      heightCm: "178",
      weightKg: "82",
      targetWeightKg: "",
      limitations: "No injuries",
    });

    expect(summary.completedCount).toBe(2);
    expect(summary.totalCount).toBe(3);
    expect(summary.percent).toBe(67);
    expect(summary.items).toEqual([
      expect.objectContaining({
        id: "training",
        complete: true,
        status: "Ready for plan generation",
      }),
      expect.objectContaining({
        id: "body",
        complete: false,
        missing: ["target weight"],
      }),
      expect.objectContaining({
        id: "safety",
        complete: true,
        status: "Coach context saved",
      }),
    ]);
  });

  test("builds quick workout actions from recent logs", () => {
    const actions = buildWorkoutQuickActions([
      {
        performedAt: "2026-06-04",
        dayLabel: "Push",
        muscleGroup: "Chest",
        exercise: "Bench Press",
        sets: 4,
        reps: "8",
        weightKg: 80,
        notes: "Solid",
      },
      {
        performedAt: "2026-06-03",
        dayLabel: "Pull",
        muscleGroup: "Back",
        exercise: "Lat Pulldown",
        sets: 3,
        reps: "10",
        weightKg: 55,
        notes: null,
      },
      {
        performedAt: "2026-06-02",
        dayLabel: "Push",
        muscleGroup: "Chest",
        exercise: "bench press",
        sets: 3,
        reps: "10",
        weightKg: 75,
        notes: null,
      },
    ]);

    expect(actions.repeatLatest).toEqual({
      label: "Repeat Bench Press",
      patch: {
        dayLabel: "Push",
        muscleGroup: "Chest",
        exercise: "Bench Press",
        sets: "4",
        reps: "8",
        weightKg: "80",
        notes: "",
      },
    });
    expect(actions.recentExercises).toEqual([
      expect.objectContaining({ label: "Bench Press" }),
      expect.objectContaining({ label: "Lat Pulldown" }),
    ]);
  });

  test("builds booking experience with upcoming sessions and coach picker options", () => {
    const experience = buildBookingExperience({
      nowIso: "2026-06-04T09:00:00.000Z",
      bookings: [
        {
          id: "past",
          status: "completed",
          scheduledAt: "2026-06-01T08:00:00.000Z",
          durationMinutes: 60,
          notes: "Leg day",
        },
        {
          id: "later",
          status: "confirmed",
          scheduledAt: "2026-06-08T08:00:00.000Z",
          durationMinutes: 60,
          notes: null,
        },
        {
          id: "next",
          status: "pending",
          scheduledAt: "2026-06-05T08:00:00.000Z",
          durationMinutes: 45,
          notes: "Technique check",
        },
      ],
      pts: [
        { id: "pt-1", displayName: "Alex Tran", email: "alex@example.com" },
        { id: "pt-2", displayName: "Linh Pham", email: "linh@example.com" },
      ],
    });

    expect(experience.nextBooking?.id).toBe("next");
    expect(experience.upcoming.map((item) => item.id)).toEqual(["next", "later"]);
    expect(experience.history.map((item) => item.id)).toEqual(["past"]);
    expect(experience.coachOptions).toEqual([
      {
        id: "auto",
        label: "Best available coach",
        detail: "Use your assigned coach or the first available PT.",
      },
      {
        id: "pt-1",
        label: "Alex Tran",
        detail: "alex@example.com",
      },
      {
        id: "pt-2",
        label: "Linh Pham",
        detail: "linh@example.com",
      },
    ]);
  });

  test("builds progress summary from real member records", () => {
    const summary = buildProgressExperience({
      today: "2026-06-04",
      workouts: [
        { performedAt: "2026-06-04", sets: 3, reps: "10", weightKg: 50 },
        { performedAt: "2026-06-02", sets: 4, reps: "8-10", weightKg: 80 },
        { performedAt: "2026-05-18", sets: 2, reps: "12", weightKg: 40 },
      ],
      inbodyReports: [
        {
          reportDate: "2026-06-04",
          weightKg: 80,
          muscleMassKg: 35,
          bodyFatPercent: 18,
        },
        {
          reportDate: "2026-05-04",
          weightKg: 82.4,
          muscleMassKg: 34.2,
          bodyFatPercent: 20.1,
        },
      ],
      nutritionReports: [
        { reportDate: "2026-06-04" },
        { reportDate: "2026-06-03" },
        { reportDate: "2026-05-20" },
      ],
      photoCount: 2,
    });

    expect(summary.weekSessions).toBe(2);
    expect(summary.monthSessions).toBe(3);
    expect(summary.weekVolumeKg).toBe(4380);
    expect(summary.weightTrend).toEqual({
      label: "Down 2.4kg",
      direction: "down",
      detail: "Since 04 May",
    });
    expect(summary.nutritionLogsThisWeek).toBe(2);
    expect(summary.photoSlotsRemaining).toBe(2);
    expect(summary.analysisReady).toBe(true);
  });

  test("builds nutrition summary from recent daily reports", () => {
    const summary = buildNutritionExperience({
      today: "2026-06-04",
      reports: [
        {
          reportDate: "2026-06-04",
          dayType: "Workout day",
          breakfast: "Oats and whey",
          lunch: "Chicken rice bowl",
          dinner: "Salmon and potatoes",
          snacks: "Greek yogurt",
          preWorkoutMeal: "Banana",
          postWorkoutMeal: "Shake",
          calories: 2210,
          proteinG: 168,
          carbsG: 245,
          fatsG: 64,
        },
        {
          reportDate: "2026-06-02",
          dayType: "Rest day",
          breakfast: "Eggs",
          lunch: "Tuna wrap",
          dinner: null,
          snacks: null,
          preWorkoutMeal: null,
          postWorkoutMeal: null,
          calories: 1900,
          proteinG: 142,
          carbsG: 180,
          fatsG: 58,
        },
      ],
    });

    expect(summary.hasAnyLog).toBe(true);
    expect(summary.todayLogged).toBe(true);
    expect(summary.weekLogCount).toBe(2);
    expect(summary.latest?.reportDate).toBe("2026-06-04");
    expect(summary.latestMeals.map((meal) => meal.label)).toEqual([
      "Breakfast",
      "Lunch",
      "Dinner",
      "Snacks",
      "Pre-workout",
      "Post-workout",
    ]);
    expect(summary.averageMacros).toEqual({
      calories: 2055,
      proteinG: 155,
      carbsG: 213,
      fatsG: 61,
    });
  });

  test("builds empty nutrition summary without fake macro values", () => {
    const summary = buildNutritionExperience({ today: "2026-06-04", reports: [] });

    expect(summary.hasAnyLog).toBe(false);
    expect(summary.todayLogged).toBe(false);
    expect(summary.weekLogCount).toBe(0);
    expect(summary.latestMeals).toEqual([]);
    expect(summary.averageMacros).toEqual({
      calories: null,
      proteinG: null,
      carbsG: null,
      fatsG: null,
    });
  });

  test("builds InBody latest baseline and trend deltas", () => {
    const summary = buildInbodyExperience([
      {
        reportDate: "2026-06-04",
        weightKg: 80.2,
        muscleMassKg: 35.4,
        bodyFatPercent: 17.8,
      },
      {
        reportDate: "2026-05-04",
        weightKg: 82.6,
        muscleMassKg: 34.9,
        bodyFatPercent: 19.5,
      },
    ]);

    expect(summary.latest?.reportDate).toBe("2026-06-04");
    expect(summary.previous?.reportDate).toBe("2026-05-04");
    expect(summary.baselineLabel).toBe("Latest baseline");
    expect(summary.deltas).toEqual({
      weightKg: { label: "Weight", value: -2.4, direction: "down", unit: "kg" },
      muscleMassKg: { label: "Muscle", value: 0.5, direction: "up", unit: "kg" },
      bodyFatPercent: { label: "Body fat", value: -1.7, direction: "down", unit: "%" },
    });
  });

  test("selects active plan as the newest plan not after today", () => {
    const active = selectActivePlan({
      today: "2026-06-04",
      plans: [
        { id: "future", planDate: "2026-06-10", title: "Future", contentMd: "future" },
        { id: "current", planDate: "2026-06-01", title: "Current", contentMd: "current" },
        { id: "old", planDate: "2026-05-01", title: "Old", contentMd: "old" },
      ],
    });

    expect(active?.id).toBe("current");
  });

  test("groups classes into booked, available, and unavailable discovery buckets", () => {
    const discovery = buildClassDiscovery({
      nowIso: "2026-06-04T09:00:00.000Z",
      sessions: [
        {
          sessionId: "booked",
          classId: "strength",
          title: "Strength Foundations",
          startsAt: "2026-06-05T08:00:00.000Z",
          durationMinutes: 45,
          capacity: 12,
          status: "scheduled",
          bookedCount: 8,
          seatsLeft: 4,
          myBooking: { id: "booking-1", status: "booked" },
        },
        {
          sessionId: "open",
          classId: "mobility",
          title: "Mobility Reset",
          startsAt: "2026-06-06T08:00:00.000Z",
          durationMinutes: 30,
          capacity: 10,
          status: "scheduled",
          bookedCount: 4,
          seatsLeft: 6,
          myBooking: null,
        },
        {
          sessionId: "full",
          classId: "hiit",
          title: "Conditioning",
          startsAt: "2026-06-07T08:00:00.000Z",
          durationMinutes: 40,
          capacity: 10,
          status: "scheduled",
          bookedCount: 10,
          seatsLeft: 0,
          myBooking: null,
        },
      ],
    });

    expect(discovery.bookedUpcoming.map((item) => item.sessionId)).toEqual(["booked"]);
    expect(discovery.availableUpcoming.map((item) => item.sessionId)).toEqual(["open"]);
    expect(discovery.unavailable.map((item) => item.sessionId)).toEqual(["full"]);
    expect(discovery.availableUpcoming[0].capacityLabel).toBe("6 seats left");
    expect(discovery.unavailable[0].capacityTone).toBe("full");
  });

  test("builds weekly check-in from mixed member progress records", () => {
    const checkIn = buildWeeklyCheckIn({
      today: "2026-06-04",
      workouts: [
        { performedAt: "2026-06-04", sets: 3, reps: "10", weightKg: 50 },
        { performedAt: "2026-06-02", sets: 4, reps: "8-10", weightKg: 80 },
      ],
      nutritionReports: [{ reportDate: "2026-06-04" }, { reportDate: "2026-06-03" }],
      inbodyReports: [
        {
          reportDate: "2026-06-04",
          weightKg: 80,
          muscleMassKg: 35,
          bodyFatPercent: 18,
        },
        {
          reportDate: "2026-05-04",
          weightKg: 82,
          muscleMassKg: 34,
          bodyFatPercent: 20,
        },
      ],
      photoCount: 1,
      plans: [{ id: "plan-1", planDate: "2026-06-01", title: "June plan", contentMd: "Plan" }],
      analyses: [{ id: "analysis-1", planDate: "2026-06-04", contentMd: "## Summary" }],
    });

    expect(checkIn.progress.weekSessions).toBe(2);
    expect(checkIn.activePlan?.id).toBe("plan-1");
    expect(checkIn.latestAnalysis?.id).toBe("analysis-1");
    expect(checkIn.items).toEqual([
      expect.objectContaining({ id: "training", complete: true }),
      expect.objectContaining({ id: "nutrition", complete: true }),
      expect.objectContaining({ id: "inbody", complete: true }),
      expect.objectContaining({ id: "plan", complete: true }),
      expect.objectContaining({ id: "photos", complete: false }),
    ]);
  });

  test("reads trainer prompt prefill from the route search string", () => {
    expect(getTrainerPromptFromSearch("?prompt=Build%20my%20next%20plan")).toBe(
      "Build my next plan",
    );
    expect(getTrainerPromptFromSearch("?prompt=%20%20")).toBe("");
    expect(getTrainerPromptFromSearch("")).toBe("");
  });
});

describe("buildWeeklyStreak", () => {
  test("counts distinct training days in the trailing 7-day window", () => {
    const streak = buildWeeklyStreak({
      today: "2026-06-17",
      workouts: [
        { performedAt: "2026-06-17" },
        { performedAt: "2026-06-17" },
        { performedAt: "2026-06-15" },
        { performedAt: "2026-06-11" },
        { performedAt: "2026-06-09" },
      ],
    });

    expect(streak.windowDays).toBe(7);
    expect(streak.sessionsThisWeek).toBe(3);
    expect(streak.percent).toBe(43);
  });

  test("counts a consecutive day streak ending today", () => {
    const streak = buildWeeklyStreak({
      today: "2026-06-17",
      workouts: [
        { performedAt: "2026-06-17" },
        { performedAt: "2026-06-16" },
        { performedAt: "2026-06-15" },
        { performedAt: "2026-06-13" },
      ],
    });

    expect(streak.currentStreak).toBe(3);
  });

  test("keeps an active streak alive when today has no workout yet", () => {
    const streak = buildWeeklyStreak({
      today: "2026-06-17",
      workouts: [{ performedAt: "2026-06-16" }, { performedAt: "2026-06-15" }],
    });

    expect(streak.currentStreak).toBe(2);
  });

  test("returns an empty streak with no workouts", () => {
    const streak = buildWeeklyStreak({ today: "2026-06-17", workouts: [] });

    expect(streak).toEqual({
      sessionsThisWeek: 0,
      windowDays: 7,
      currentStreak: 0,
      percent: 0,
    });
  });
});
