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
        "Save or update the user's profile: goal, experience level, limitations, age, gender, height, current weight, and target weight. Call this only after collecting the fields the user wants to save or update.",
      inputSchema: z.object({
        goal: z.string().optional(),
        level: z.enum(["Beginner", "Intermediate", "Advanced"]).optional(),
        limitations: z.string().optional(),
        age: z.number().int().min(10).max(120).optional(),
        gender: z.enum(["male", "female", "other"]).optional(),
        heightCm: z.number().min(50).max(280).optional(),
        weightKg: z.number().min(20).max(400).optional(),
        targetWeightKg: z.number().min(20).max(400).optional(),
      }),
      execute: async (input) => {
        const [existing] = await db
          .select({ userId: schema.profiles.userId })
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, userId))
          .limit(1);
        const patch = { ...input, updatedAt: new Date().toISOString() };
        if (existing) {
          await db.update(schema.profiles).set(patch).where(eq(schema.profiles.userId, userId));
        } else {
          await db.insert(schema.profiles).values({ userId, ...patch });
        }
        return { ok: true, saved: input };
      },
    }),

    get_profile: tool({
      description: "Read the current user's profile (goal, level, limitations, age, weight, etc).",
      inputSchema: z.object({}),
      execute: async () => {
        const [row] = await db
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, userId))
          .limit(1);
        return row ?? { empty: true };
      },
    }),

    generate_workout_plan: tool({
      description:
        "Generate a personalized workout plan for a given date and save it as Markdown. Use this when the user asks for a workout plan. Before calling, make sure you know days per week, available equipment, goal, level, and relevant limitations; ask one missing question at a time.",
      inputSchema: z.object({
        planDate: z.string().describe("YYYY-MM-DD"),
        daysPerWeek: z.string().describe("e.g. '4 days', '6-7 days'"),
        equipment: z.string().describe("e.g. 'Full gym', 'Dumbbells at home', 'Bodyweight only'"),
        goal: z
          .string()
          .max(500)
          .optional()
          .describe("The user's current goal for this plan, if they supplied it in chat"),
        level: z
          .string()
          .max(120)
          .optional()
          .describe("The user's experience level or training history, if supplied in chat"),
        limitations: z
          .string()
          .max(500)
          .optional()
          .describe("Injuries, movement limits, or constraints supplied in chat"),
      }),
      execute: async ({ planDate, daysPerWeek, equipment, goal, level, limitations }) => {
        const [profile] = await db
          .select()
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, userId))
          .limit(1);
        const groq = getGroq();
        const sys = `You are Alex, a certified personal trainer. Generate a complete workout plan in Markdown.
RULES:
- Use a Markdown table per training day with columns: Exercise | Sets | Reps | Rest
- Include a warm-up section and a cool-down section
- Tailor to the user's goal, level, limitations, equipment
- Add a short notes/tips section at the end
Return ONLY the Markdown plan, no preamble.`;
        const usr = `User profile:
- Goal: ${goal || profile?.goal || "general fitness"}
- Level: ${level || profile?.level || "beginner"}
- Limitations: ${limitations || profile?.limitations || "none"}
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
        await db
          .insert(schema.workoutPlanDocs)
          .values({
            id,
            userId,
            planDate,
            title: `Plan for ${planDate} - ${daysPerWeek}`,
            contentMd: text,
          });
        return { ok: true, planDate, preview: text.slice(0, 400) };
      },
    }),

    log_workout_entry: tool({
      description:
        "Log one completed exercise for a date. Before calling, make sure the exercise name and date are known; ask for sets, reps, weight, and notes when useful. After logging, ask whether to log another exercise.",
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
        await db.insert(schema.workoutLogs).values({ id, userId, ...input });
        return { ok: true, id };
      },
    }),

    log_nutrition_report: tool({
      description:
        "Save a full daily nutrition log. Before calling, collect breakfast, lunch, dinner, snacks, day type, and for workout days the pre/post workout meal. If the user only asks for advice, read context and answer without writing a report.",
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
        await db
          .insert(schema.nutritionReports)
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
          });
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
        await db.insert(schema.progressReports).values({ id, userId, ...input });
        return { ok: true, id };
      },
    }),

    get_plan_for_date: tool({
      description:
        "Fetch the saved workout plan Markdown for a date (used before analyzing progress).",
      inputSchema: z.object({ planDate: z.string() }),
      execute: async ({ planDate }) => {
        const [row] = await db
          .select()
          .from(schema.workoutPlanDocs)
          .where(
            and(
              eq(schema.workoutPlanDocs.userId, userId),
              eq(schema.workoutPlanDocs.planDate, planDate),
            ),
          )
          .orderBy(desc(schema.workoutPlanDocs.createdAt))
          .limit(1);
        return row ?? { empty: true, message: `No plan saved for ${planDate}` };
      },
    }),

    get_workouts_since: tool({
      description: "Fetch all workout log entries since a date (YYYY-MM-DD) for analysis.",
      inputSchema: z.object({ fromDate: z.string() }),
      execute: async ({ fromDate }) => {
        const rows = await db
          .select()
          .from(schema.workoutLogs)
          .where(
            and(
              eq(schema.workoutLogs.userId, userId),
              gte(schema.workoutLogs.performedAt, fromDate),
            ),
          )
          .orderBy(desc(schema.workoutLogs.performedAt));
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
        await db.insert(schema.analyses).values({ id, userId, planDate, contentMd: analysisMd });
        return { ok: true, id };
      },
    }),

    create_support_ticket: tool({
      description:
        "Create a human support ticket when the user asks for manager/PT help, reports a booking issue, or needs a human to follow up. Ask for a short subject and issue summary first if missing.",
      inputSchema: z.object({
        subject: z.string().min(3).max(120),
        message: z.string().min(5).max(2000),
      }),
      execute: async ({ subject, message }) => {
        const id = newId();
        await db
          .insert(schema.supportTickets)
          .values({
            id,
            customerId: userId,
            subject,
            message,
            source: "ai_chat",
          });
        return { ok: true, id };
      },
    }),

    get_recent_nutrition: tool({
      description:
        "Read recent nutrition reports for the current user. Use this before giving specific nutrition feedback or when the user asks what they have been eating recently.",
      inputSchema: z.object({
        fromDate: z.string().optional().describe("Optional YYYY-MM-DD lower bound"),
        limit: z.number().int().min(1).max(20).default(5),
      }),
      execute: async ({ fromDate, limit }) => {
        const where = fromDate
          ? and(
              eq(schema.nutritionReports.userId, userId),
              gte(schema.nutritionReports.reportDate, fromDate),
            )
          : eq(schema.nutritionReports.userId, userId);
        const rows = await db
          .select()
          .from(schema.nutritionReports)
          .where(where)
          .orderBy(
            desc(schema.nutritionReports.reportDate),
            desc(schema.nutritionReports.createdAt),
          )
          .limit(limit);
        return { count: rows.length, reports: rows };
      },
    }),

    get_inbody_reports: tool({
      description:
        "Read recent InBody reports for the current user. Use this before discussing body composition, muscle mass, body fat, or weight trends.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(10).default(3),
      }),
      execute: async ({ limit }) => {
        const rows = await db
          .select()
          .from(schema.inbodyReports)
          .where(eq(schema.inbodyReports.userId, userId))
          .orderBy(desc(schema.inbodyReports.reportDate), desc(schema.inbodyReports.createdAt))
          .limit(limit);
        return { count: rows.length, reports: rows };
      },
    }),

    get_progress_reports: tool({
      description:
        "Read recent progress reports for the current user. Use this before discussing streaks, consistency, total sessions, or training volume.",
      inputSchema: z.object({
        fromDate: z.string().optional().describe("Optional YYYY-MM-DD lower bound"),
        limit: z.number().int().min(1).max(20).default(5),
      }),
      execute: async ({ fromDate, limit }) => {
        const where = fromDate
          ? and(
              eq(schema.progressReports.userId, userId),
              gte(schema.progressReports.reportDate, fromDate),
            )
          : eq(schema.progressReports.userId, userId);
        const rows = await db
          .select()
          .from(schema.progressReports)
          .where(where)
          .orderBy(desc(schema.progressReports.reportDate), desc(schema.progressReports.createdAt))
          .limit(limit);
        return { count: rows.length, reports: rows };
      },
    }),

    get_latest_analysis: tool({
      description:
        "Read the latest saved AI analysis for the current user. Use this before continuing a previous progress discussion or comparing current training against prior recommendations.",
      inputSchema: z.object({}),
      execute: async () => {
        const [row] = await db
          .select()
          .from(schema.analyses)
          .where(eq(schema.analyses.userId, userId))
          .orderBy(desc(schema.analyses.createdAt))
          .limit(1);
        return row ?? { empty: true };
      },
    }),
  };
}
