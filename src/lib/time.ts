export const SAIGON_TZ = "Asia/Ho_Chi_Minh";

export type MealBucket = "breakfast" | "lunch" | "dinner" | "snacks";

// Local calendar date (YYYY-MM-DD) and 24h hour for the given instant in
// Asia/Saigon, computed via Intl so it stays correct regardless of server TZ.
export function saigonParts(date: Date = new Date()): { date: string; hour: number } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAIGON_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  let hour = Number(get("hour"));
  if (!Number.isFinite(hour) || hour === 24) hour = 0;
  return { date: dateStr, hour };
}

export function saigonDateString(date: Date = new Date()): string {
  return saigonParts(date).date;
}

// Map a 24h hour to a meal slot. Late-night and mid-afternoon fall back to snacks.
export function bucketMealByHour(hour: number): MealBucket {
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snacks";
}
