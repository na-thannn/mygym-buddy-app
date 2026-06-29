import logDevError from "@/lib/error-logger";
import { estimateMacrosForMeals, estimateMealFromImage } from "@/lib/nutrition.functions";
import { normalizeMealMacros, type MealMacroTotals } from "@/lib/meal-macros";
import { isAiConfigured } from "@/lib/trainer/groq";
import { bucketMealByHour, saigonParts } from "@/lib/time";

export type { MealMacroTotals } from "@/lib/meal-macros";
export { normalizeMealMacros } from "@/lib/meal-macros";

function clampNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function macrosFromEstimate(result: {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
}): MealMacroTotals {
  return {
    calories: clampNumber(result.calories),
    proteinG: clampNumber(result.protein_g),
    carbsG: clampNumber(result.carbs_g),
    fatsG: clampNumber(result.fats_g),
  };
}

async function estimateMacrosFromText(bucket: string, text: string): Promise<MealMacroTotals> {
  const meals =
    bucket === "breakfast"
      ? { breakfast: text }
      : bucket === "lunch"
        ? { lunch: text }
        : bucket === "dinner"
          ? { dinner: text }
          : { snacks: text };
  const result = await estimateMacrosForMeals(meals);
  return macrosFromEstimate(result);
}

export async function analyseFeedPostMeal(input: {
  content?: string | null;
  imageBase64?: string | null;
}): Promise<{
  mealName: string;
  macros: MealMacroTotals | null;
  suggestedBucket: string;
  aiConfigured: boolean;
}> {
  const text = (input.content ?? "").trim();
  const image = input.imageBase64;
  if (!text && !image) {
    throw new Error("This post has nothing to analyse");
  }

  const { hour } = saigonParts();
  const suggestedBucket = bucketMealByHour(hour);

  let mealName = text ? text.slice(0, 120) : "Meal";
  let macros: MealMacroTotals | null = null;

  const aiConfigured = isAiConfigured();
  if (aiConfigured) {
    try {
      if (image) {
        try {
          const result = await estimateMealFromImage({
            imageDataUrl: image,
            note: text || null,
          });
          if (result.name) mealName = result.name.slice(0, 120);
          macros = macrosFromEstimate(result);
        } catch (imageErr) {
          if (text) {
            macros = await estimateMacrosFromText(suggestedBucket, text);
          } else {
            throw imageErr;
          }
        }
      } else {
        macros = await estimateMacrosFromText(suggestedBucket, text);
      }
    } catch (err) {
      await logDevError({
        error: err,
        req: { method: "POST", url: "/api/feed/analyse-meal" },
      }).catch(() => {});
      macros = null;
    }
  }

  return { mealName, macros: normalizeMealMacros(macros), suggestedBucket, aiConfigured };
}
