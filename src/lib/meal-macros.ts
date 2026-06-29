export type MealMacroTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatsG: number;
};

function clampNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : 0;
}

export function normalizeMealMacros(raw: unknown): MealMacroTotals | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const macros: MealMacroTotals = {
    calories: clampNumber(obj.calories),
    proteinG: clampNumber(obj.proteinG ?? obj.protein_g),
    carbsG: clampNumber(obj.carbsG ?? obj.carbs_g),
    fatsG: clampNumber(obj.fatsG ?? obj.fats_g),
  };
  if (
    macros.calories <= 0 &&
    macros.proteinG <= 0 &&
    macros.carbsG <= 0 &&
    macros.fatsG <= 0
  ) {
    return null;
  }
  return macros;
}
