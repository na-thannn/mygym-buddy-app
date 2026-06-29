import { createServerFn } from "@tanstack/react-start";
import logDevError from "@/lib/error-logger";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { generateObject } from "ai";
import { ALEX_VISION_MODEL_ID, FAST_MODEL_ID, getModelProvider } from "./trainer/groq";

async function requireSession() {
  const { readSessionCookie, validateSessionToken } = await import("@/server/auth");
  const token = readSessionCookie();
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const session = await validateSessionToken(token);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return session;
}

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
  calories: z.number().min(0).optional().nullable(),
  proteinG: z.number().min(0).optional().nullable(),
  carbsG: z.number().min(0).optional().nullable(),
  fatsG: z.number().min(0).optional().nullable(),
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
  const provider = getModelProvider();
  const prompt = `Estimate total daily macros from the meals below. Respond with a JSON object containing calories (kcal), protein_g, carbs_g, and fats_g as numbers.
Breakfast: ${meals.breakfast || "(none)"}
Lunch: ${meals.lunch || "(none)"}
Dinner: ${meals.dinner || "(none)"}
Snacks: ${meals.snacks || "(none)"}
Pre-workout: ${meals.preWorkoutMeal || "(none)"}
Post-workout: ${meals.postWorkoutMeal || "(none)"}`;
  const { object } = await generateObject({
    model: provider(FAST_MODEL_ID),
    schema: macrosSchema,
    prompt,
  });
  return object;
}

const mealVisionSchema = z.object({
  name: z.string(),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fats_g: z.number(),
});

// Identify a meal from a photo (and optional note) and estimate its macros.
// Uses a multimodal model; the OpenAI-compatible provider forwards the data
// URL as an image_url part.
export async function estimateMealFromImage(input: { imageDataUrl: string; note?: string | null }) {
  const provider = getModelProvider();
  const promptText = [
    "You are a nutrition assistant. Identify the meal in this photo and estimate the macros for the portion shown.",
    input.note ? `The member also wrote: "${input.note}".` : "",
    "Return a JSON object with name (short meal label), calories (kcal), protein_g, carbs_g, and fats_g as numbers.",
  ]
    .filter(Boolean)
    .join(" ");
  const { object } = await generateObject({
    model: provider(ALEX_VISION_MODEL_ID),
    schema: mealVisionSchema,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: promptText },
          { type: "image", image: input.imageDataUrl },
        ],
      },
    ],
  });
  return object;
}

export const saveNutritionReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => reportInput.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const { newId } = await import("@/server/auth");
    let macros: { calories: number; protein_g: number; carbs_g: number; fats_g: number } | null =
      null;
    const manualMacros = {
      calories: data.calories ?? null,
      proteinG: data.proteinG ?? null,
      carbsG: data.carbsG ?? null,
      fatsG: data.fatsG ?? null,
    };
    if (data.estimateMacros) {
      try {
        macros = await estimateMacrosForMeals(data);
      } catch (e) {
        await logDevError({ error: e, req: null }).catch(() => {});
      }
    }
    const resolvedMacros = {
      calories: macros?.calories ?? manualMacros.calories,
      proteinG: macros?.protein_g ?? manualMacros.proteinG,
      carbsG: macros?.carbs_g ?? manualMacros.carbsG,
      fatsG: macros?.fats_g ?? manualMacros.fatsG,
    };
    const id = newId();
    try {
      await db.insert(schema.nutritionReports).values({
        id,
        userId: session.userId,
        reportDate: data.reportDate,
        breakfast: data.breakfast ?? null,
        lunch: data.lunch ?? null,
        dinner: data.dinner ?? null,
        snacks: data.snacks ?? null,
        dayType: data.dayType ?? null,
        preWorkoutMeal: data.preWorkoutMeal ?? null,
        postWorkoutMeal: data.postWorkoutMeal ?? null,
        notes: data.notes ?? null,
        calories: resolvedMacros.calories ?? null,
        proteinG: resolvedMacros.proteinG ?? null,
        carbsG: resolvedMacros.carbsG ?? null,
        fatsG: resolvedMacros.fatsG ?? null,
      });
      const hasMacros = Object.values(resolvedMacros).some((v) => typeof v === "number");
      return { ok: true, id, macros: hasMacros ? resolvedMacros : null };
    } catch (err) {
      await logDevError({ error: err, req: null }).catch(() => {});
      throw new Response("Server error", { status: 500 });
    }
  });

export const listNutritionReports = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireSession();
  const { db, schema } = await import("@/server/db");
  return await db
    .select()
    .from(schema.nutritionReports)
    .where(eq(schema.nutritionReports.userId, session.userId))
    .orderBy(desc(schema.nutritionReports.reportDate))
    .limit(50);
});
