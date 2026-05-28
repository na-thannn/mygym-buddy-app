import { tool } from "ai";
import { z } from "zod";
import { and, desc, eq, gte } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { newId } from "@/server/auth";
import { estimateMacrosForMeals } from "@/lib/nutrition.functions";
import { getGroq, ALEX_MODEL_ID } from "./groq";
import logDevError from "@/lib/error-logger";
import { generateText } from "ai";

// All tools are bound to a specific userId at request time so the model can never escape that scope.
export function buildAlexTools(userId: string) {
  return {
    save_profile: tool({
      description:
        "Save or update the user's profile: goal, experience level, limitations, age, gender, height, weight. Call this after collecting profile info during onboarding or when the user asks to update their profile.",
      inputSchema: z.object({
        goal: z.string().optional(),
        level: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
        limitations: z.string().optional(),
        age: z.number().int().min(10).max(120).optional(),
        gender: z.enum(["male", "female", "other"]).optional(),
        heightCm: z.number().min(50).max(280).optional(),
        weightKg: z.number().min(20).max(400).optional(),
      }),
      execute: async (input) => {
        const existing = db
          .select({ userId: schema.profiles.userId })
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, userId))
          .get();
        const patch = { ...input, updatedAt: new Date().toISOString() };
        if (existing) {
          db.update(schema.profiles).set(patch).where(eq(schema.profiles.userId, userId)).run();
        } else {
          db.insert(schema.profiles)
            .values({ userId, ...patch })
            .run();
        }
        return { ok: true, saved: input };
      },
    }),

    get_profile: tool({
      description: "Read the current user's profile (goal, level, limitations, age, weight, etc).",
      inputSchema: z.object({}),
      execute: async () => {
        const row = db
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, userId))
          .get();
        return row ?? { empty: true };
      },
    }),

    generate_workout_plan: tool({
      description:
        "Generate a personalized workout plan for a given date and save it as Markdown. Use this when the user asks for a workout plan. Always ask first: how many days/week and what equipment they have access to.",
      inputSchema: z.object({
        planDate: z.string().describe("YYYY-MM-DD"),
        daysPerWeek: z.string().describe("e.g. '4 days', '6-7 days'"),
        equipment: z.string().describe("e.g. 'Full gym', 'Dumbbells at home', 'Bodyweight only'"),
      }),
      execute: async ({ planDate, daysPerWeek, equipment }) => {
        const profile = db
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, userId))
          .get();
        const groq = getGroq();
        const sys = `You are Alex, a certified personal trainer. Generate a complete workout plan in Markdown.
RULES:
- Use a Markdown table per training day with columns: Exercise | Sets | Reps | Rest
- Include a warm-up section and a cool-down section
- Tailor to the user's goal, level, limitations, equipment
- Add a short notes/tips section at the end
Return ONLY the Markdown plan, no preamble.`;
        const usr = `User profile:
- Goal: ${profile?.goal || "general fitness"}
- Level: ${profile?.level || "beginner"}
- Limitations: ${profile?.limitations || "none"}
- Age: ${profile?.age ?? "n/a"}
- Weight: ${profile?.weightKg ?? "n/a"} kg
- Days/week: ${daysPerWeek}
- Equipment: ${equipment}
- Plan date: ${planDate}`;
        const { text } = await generateText({
          model: groq(ALEX_MODEL_ID),
          messages: [
            { role: "system", content: sys },
            { role: "user", content: usr },
          ],
        });
        const id = newId();
        db.insert(schema.workoutPlanDocs)
          .values({
            id,
            userId,
            planDate,
            title: `Plan for ${planDate} — ${daysPerWeek}`,
            contentMd: text,
          })
          .run();
        return { ok: true, planDate, preview: text.slice(0, 400) };
      },
    }),

    log_workout_entry: tool({
      description:
        "Log a single completed exercise for a date. Loop in the conversation by asking 'log another?' after each.",
      inputSchema: z.object({
        performedAt: z.string().describe("YYYY-MM-DD"),
        dayLabel: z.string().optional(),
        muscleGroup: z.string().optional().describe("Push, Pull, Legs, Bro split, ..."),
        exercise: z.string(),
        sets: z.number().int().min(1).max(50).optional(),
        reps: z.string().optional().describe("e.g. '8' or '8-12'"),
        weightKg: z.number().min(0).max(1000).optional(),
        notes: z.string().optional(),
      }),
      execute: async (input) => {
        const id = newId();
        db.insert(schema.workoutLogs)
          .values({ id, userId, ...input })
          .run();
        return { ok: true, id };
      },
    }),

    log_nutrition_report: tool({
      description:
        "Save a full daily nutrition log. After collecting all meals, also estimates macros via AI. Always ask: breakfast, lunch, dinner, snacks, day type, and for workout days the pre/post workout meal.",
      inputSchema: z.object({
        reportDate: z.string(),
        breakfast: z.string().optional(),
        lunch: z.string().optional(),
        dinner: z.string().optional(),
        snacks: z.string().optional(),
        dayType: z.enum(["Workout day", "Rest day", "Cheat day"]).optional(),
        preWorkoutMeal: z.string().optional(),
        postWorkoutMeal: z.string().optional(),
        notes: z.string().optional(),
      }),
      execute: async (input) => {
        let macros: {
          calories: number;
          protein_g: number;
          carbs_g: number;
          fats_g: number;
        } | null = null;
        try {
          macros = await estimateMacrosForMeals(input);
        } catch (e) {
          await logDevError({ error: e, req: null }).catch(() => {});
        }
        const id = newId();
        db.insert(schema.nutritionReports)
          .values({
            id,
            userId,
            reportDate: input.reportDate,
            breakfast: input.breakfast,
            lunch: input.lunch,
            dinner: input.dinner,
            snacks: input.snacks,
            dayType: input.dayType,
            preWorkoutMeal: input.preWorkoutMeal,
            postWorkoutMeal: input.postWorkoutMeal,
            notes: input.notes,
            calories: macros?.calories,
            proteinG: macros?.protein_g,
            carbsG: macros?.carbs_g,
            fatsG: macros?.fats_g,
          })
          .run();
        return { ok: true, id, macros };
      },
    }),

    log_progress_report: tool({
      description:
        "Save a weekly progress report (total sessions, streak days, total volume in kg, notes).",
      inputSchema: z.object({
        reportDate: z.string(),
        totalSessions: z.number().int().min(0).max(50),
        streakDays: z.number().int().min(0).max(3650),
        totalVolume: z.number().min(0),
        notes: z.string().optional(),
      }),
      execute: async (input) => {
        const id = newId();
        db.insert(schema.progressReports)
          .values({ id, userId, ...input })
          .run();
        return { ok: true, id };
      },
    }),

    get_plan_for_date: tool({
      description:
        "Fetch the saved workout plan Markdown for a date (used before analyzing progress).",
      inputSchema: z.object({ planDate: z.string() }),
      execute: async ({ planDate }) => {
        const row = db
          .select()
          .from(schema.workoutPlanDocs)
          .where(
            and(
              eq(schema.workoutPlanDocs.userId, userId),
              eq(schema.workoutPlanDocs.planDate, planDate),
            ),
          )
          .orderBy(desc(schema.workoutPlanDocs.createdAt))
          .get();
        return row ?? { empty: true, message: `No plan saved for ${planDate}` };
      },
    }),

    get_workouts_since: tool({
      description: "Fetch all workout log entries since a date (YYYY-MM-DD) for analysis.",
      inputSchema: z.object({ fromDate: z.string() }),
      execute: async ({ fromDate }) => {
        const rows = db
          .select()
          .from(schema.workoutLogs)
          .where(
            and(
              eq(schema.workoutLogs.userId, userId),
              gte(schema.workoutLogs.performedAt, fromDate),
            ),
          )
          .orderBy(desc(schema.workoutLogs.performedAt))
          .all();
        return { count: rows.length, entries: rows };
      },
    }),

    analyze_progress: tool({
      description:
        "Compare the user's actual workouts against the plan for a date, write a Markdown analysis with insights & recommendations, and save it. Always call get_plan_for_date and get_workouts_since first to gather data, then call this with the full analysis text.",
      inputSchema: z.object({
        planDate: z.string(),
        analysisMd: z.string().min(20),
      }),
      execute: async ({ planDate, analysisMd }) => {
        const id = newId();
        db.insert(schema.analyses).values({ id, userId, planDate, contentMd: analysisMd }).run();
        return { ok: true, id };
      },
    }),

    create_support_ticket: tool({
      description:
        "Create a human support ticket when the user asks for staff/PT help, reports a booking issue, or needs a human to follow up. Ask for a short subject and issue summary first if missing.",
      inputSchema: z.object({
        subject: z.string().min(3).max(120),
        message: z.string().min(5).max(2000),
      }),
      execute: async ({ subject, message }) => {
        const id = newId();
        db.insert(schema.supportTickets)
          .values({
            id,
            customerId: userId,
            subject,
            message,
            source: "ai_chat",
          })
          .run();
        return { ok: true, id };
      },
    }),
  };
}
