import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { generateObject } from "ai";
import { db, schema } from "@/server/db";
import { requireAuth, newId } from "@/server/auth";
import { getGroq, FAST_MODEL_ID } from "./trainer/groq";

const reportInput = z.object({
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  breakfast: z.string().max(500).optional().nullable(),
  lunch: z.string().max(500).optional().nullable(),
  dinner: z.string().max(500).optional().nullable(),
  snacks: z.string().max(500).optional().nullable(),
  dayType: z.enum(["Workout day", "Rest day", "Cheat day"]).optional().nullable(),
  preWorkoutMeal: z.string().max(500).optional().nullable(),
  postWorkoutMeal: z.string().max(500).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  estimateMacros: z.boolean().default(true),
});

const macrosSchema = z.object({
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fats_g: z.number(),
});

export async function estimateMacrosForMeals(meals: {
  breakfast?: string | null;
  lunch?: string | null;
  dinner?: string | null;
  snacks?: string | null;
  preWorkoutMeal?: string | null;
  postWorkoutMeal?: string | null;
}) {
  const groq = getGroq();
  const prompt = `Estimate total daily macros from the meals below. Return ONLY numbers in grams and kcal.
Breakfast: ${meals.breakfast || "(none)"}
Lunch: ${meals.lunch || "(none)"}
Dinner: ${meals.dinner || "(none)"}
Snacks: ${meals.snacks || "(none)"}
Pre-workout: ${meals.preWorkoutMeal || "(none)"}
Post-workout: ${meals.postWorkoutMeal || "(none)"}`;
  const { object } = await generateObject({
    model: groq(FAST_MODEL_ID),
    schema: macrosSchema,
    prompt,
  });
  return object;
}

export const saveNutritionReport = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: unknown) => reportInput.parse(d))
  .handler(async ({ data, context }) => {
    let macros: { calories: number; protein_g: number; carbs_g: number; fats_g: number } | null = null;
    if (data.estimateMacros) {
      try {
        macros = await estimateMacrosForMeals(data);
      } catch (e) {
        console.error("Macro estimation failed:", e);
      }
    }
    const id = newId();
    db.insert(schema.nutritionReports).values({
      id,
      userId: context.userId,
      reportDate: data.reportDate,
      breakfast: data.breakfast ?? null,
      lunch: data.lunch ?? null,
      dinner: data.dinner ?? null,
      snacks: data.snacks ?? null,
      dayType: data.dayType ?? null,
      preWorkoutMeal: data.preWorkoutMeal ?? null,
      postWorkoutMeal: data.postWorkoutMeal ?? null,
      notes: data.notes ?? null,
      calories: macros?.calories ?? null,
      proteinG: macros?.protein_g ?? null,
      carbsG: macros?.carbs_g ?? null,
      fatsG: macros?.fats_g ?? null,
    }).run();
    return { ok: true, id, macros };
  });

export const listNutritionReports = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    return db
      .select()
      .from(schema.nutritionReports)
      .where(eq(schema.nutritionReports.userId, context.userId))
      .orderBy(desc(schema.nutritionReports.reportDate))
      .limit(50)
      .all();
  });