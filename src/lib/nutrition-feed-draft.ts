export const NUTRITION_FEED_DRAFT_KEY = "nutritionFeedDraft";

export type NutritionFeedDraft = {
  postId?: string;
  mealName: string;
  macros: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatsG: number;
  } | null;
  reportDate: string;
  suggestedBucket?: string;
};

export type MealSlot =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snacks"
  | "preWorkoutMeal"
  | "postWorkoutMeal";

export function readNutritionFeedDraft(): NutritionFeedDraft | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(NUTRITION_FEED_DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NutritionFeedDraft;
  } catch {
    return null;
  }
}

export function clearNutritionFeedDraft() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(NUTRITION_FEED_DRAFT_KEY);
}

export function writeNutritionFeedDraft(draft: NutritionFeedDraft) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(NUTRITION_FEED_DRAFT_KEY, JSON.stringify(draft));
}

export function suggestedBucketToSlot(bucket?: string): MealSlot | null {
  if (bucket === "breakfast") return "breakfast";
  if (bucket === "lunch") return "lunch";
  if (bucket === "dinner") return "dinner";
  if (bucket === "snacks") return "snacks";
  return null;
}
