import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/server/db";
import { buildGymKnowledge } from "./gym-knowledge";
import {
  HL_FITNESS_GYM_ACCESS,
  formatHlFitnessEquipmentLayout,
} from "./hl-fitness-layout";

const DEFAULT_CONTEXT_DAYS = 21;
const MAX_CONTEXT_CHARS = 12000;

type BuildTrainerContextInput = {
  userId: string;
  now?: Date;
  days?: number;
};

export type TrainerContext = {
  days: number;
  startDate: string;
  endDate: string;
  text: string;
};

export function getAlexContextDays() {
  const raw = Number(process.env.ALEX_CHAT_CONTEXT_DAYS ?? DEFAULT_CONTEXT_DAYS);
  if (!Number.isFinite(raw)) return DEFAULT_CONTEXT_DAYS;
  return Math.min(Math.max(Math.trunc(raw), 7), 90);
}

export async function buildTrainerContext({
  userId,
  now = new Date(),
  days = getAlexContextDays(),
}: BuildTrainerContextInput): Promise<TrainerContext> {
  const resolvedDays = Math.min(Math.max(Math.trunc(days), 1), 90);
  const endDate = formatYmd(now);
  const startDate = formatYmd(addDays(now, -(resolvedDays - 1)));

  const [profileRows, workouts, nutrition, progress, inbody, plans, analyses] = await Promise.all([
    db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId)).limit(1),
    db
      .select()
      .from(schema.workoutLogs)
      .where(
        and(
          eq(schema.workoutLogs.userId, userId),
          gte(schema.workoutLogs.performedAt, startDate),
          lte(schema.workoutLogs.performedAt, endDate),
        ),
      )
      .orderBy(desc(schema.workoutLogs.performedAt), desc(schema.workoutLogs.createdAt))
      .limit(12),
    db
      .select()
      .from(schema.nutritionReports)
      .where(
        and(
          eq(schema.nutritionReports.userId, userId),
          gte(schema.nutritionReports.reportDate, startDate),
          lte(schema.nutritionReports.reportDate, endDate),
        ),
      )
      .orderBy(desc(schema.nutritionReports.reportDate), desc(schema.nutritionReports.createdAt))
      .limit(5),
    db
      .select()
      .from(schema.progressReports)
      .where(
        and(
          eq(schema.progressReports.userId, userId),
          gte(schema.progressReports.reportDate, startDate),
          lte(schema.progressReports.reportDate, endDate),
        ),
      )
      .orderBy(desc(schema.progressReports.reportDate), desc(schema.progressReports.createdAt))
      .limit(5),
    db
      .select()
      .from(schema.inbodyReports)
      .where(eq(schema.inbodyReports.userId, userId))
      .orderBy(desc(schema.inbodyReports.reportDate), desc(schema.inbodyReports.createdAt))
      .limit(3),
    db
      .select()
      .from(schema.workoutPlanDocs)
      .where(eq(schema.workoutPlanDocs.userId, userId))
      .orderBy(desc(schema.workoutPlanDocs.planDate), desc(schema.workoutPlanDocs.createdAt))
      .limit(3),
    db
      .select()
      .from(schema.analyses)
      .where(eq(schema.analyses.userId, userId))
      .orderBy(desc(schema.analyses.createdAt))
      .limit(3),
  ]);
  const profile = profileRows[0];
  const gymKnowledge = await buildGymKnowledge({ userId, now });

  const sections = [
    `Member context (today ${endDate}, recent window ${startDate} to ${endDate})`,
    formatProfile(profile),
    formatHlFitnessEquipmentLayout(),
    formatWorkouts(workouts),
    formatNutrition(nutrition),
    formatProgress(progress),
    formatInbody(inbody),
    formatPlans(plans),
    formatAnalyses(analyses),
    gymKnowledge.text,
  ].filter(Boolean);

  return {
    days: resolvedDays,
    startDate,
    endDate,
    text: limitText(sections.join("\n\n"), MAX_CONTEXT_CHARS),
  };
}

export function formatYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatProfile(profile: typeof schema.profiles.$inferSelect | undefined) {
  if (!profile) return "Profile:\n- No saved profile yet.";
  return [
    "Profile:",
    `- Goal: ${profile.goal || "not saved"}`,
    `- Level: ${profile.level || "not saved"}`,
    `- Limitations: ${profile.limitations || "none saved"}`,
    `- Age: ${profile.age ?? "not saved"}`,
    `- Gender: ${profile.gender || "not saved"}`,
    `- Height: ${profile.heightCm ?? "not saved"} cm`,
    `- Weight: ${profile.weightKg ?? "not saved"} kg`,
    `- Target weight: ${profile.targetWeightKg ?? "not saved"} kg`,
    `- Days per week: ${profile.daysPerWeek || "not saved"}`,
    `- Equipment: ${HL_FITNESS_GYM_ACCESS} (HL Fitness branch)`,
  ].join("\n");
}

function formatWorkouts(workouts: Array<typeof schema.workoutLogs.$inferSelect>) {
  if (workouts.length === 0) return "Recent workouts:\n- No workouts logged in this window.";
  return [
    "Recent workouts:",
    ...workouts.map((row) => {
      const load = row.weightKg != null ? `${row.weightKg} kg` : "bodyweight/unspecified load";
      const sets = row.sets != null ? `${row.sets} sets` : "sets not logged";
      const reps = row.reps ? `${row.reps} reps` : "reps not logged";
      const group = row.muscleGroup ? `, ${row.muscleGroup}` : "";
      return `- ${row.performedAt}: ${row.exercise} (${sets}, ${reps}, ${load}${group})`;
    }),
  ].join("\n");
}

function formatNutrition(nutrition: Array<typeof schema.nutritionReports.$inferSelect>) {
  if (nutrition.length === 0) return "Recent nutrition:\n- No nutrition reports in this window.";
  return [
    "Recent nutrition:",
    ...nutrition.map((row) => {
      const macros = [
        row.calories != null ? `${Math.round(row.calories)} kcal` : null,
        row.proteinG != null ? `${Math.round(row.proteinG)} g protein` : null,
        row.carbsG != null ? `${Math.round(row.carbsG)} g carbs` : null,
        row.fatsG != null ? `${Math.round(row.fatsG)} g fats` : null,
      ]
        .filter(Boolean)
        .join(", ");
      const meals = [row.breakfast, row.lunch, row.dinner, row.snacks].filter(Boolean).join("; ");
      return `- ${row.reportDate}: ${row.dayType || "day type not logged"}${macros ? `, ${macros}` : ""}${meals ? `; meals: ${limitText(meals, 180)}` : ""}`;
    }),
  ].join("\n");
}

function formatProgress(progress: Array<typeof schema.progressReports.$inferSelect>) {
  if (progress.length === 0) return "Progress reports:\n- No progress reports in this window.";
  return [
    "Progress reports:",
    ...progress.map(
      (row) =>
        `- ${row.reportDate}: ${row.totalSessions ?? 0} sessions, ${row.streakDays ?? 0} day streak, ${Math.round(row.totalVolume ?? 0)} kg volume${row.notes ? `; notes: ${limitText(row.notes, 160)}` : ""}`,
    ),
  ].join("\n");
}

function formatInbody(inbody: Array<typeof schema.inbodyReports.$inferSelect>) {
  if (inbody.length === 0) return "InBody:\n- No InBody reports saved.";
  return [
    "InBody:",
    ...inbody.map(
      (row) =>
        `- ${row.reportDate}: ${row.weightKg} kg, ${row.muscleMassKg} kg muscle, ${row.bodyFatPercent}% body fat`,
    ),
  ].join("\n");
}

function formatPlans(plans: Array<typeof schema.workoutPlanDocs.$inferSelect>) {
  if (plans.length === 0) return "Saved plans:\n- No saved workout plans.";
  return [
    "Saved plans:",
    ...plans.map(
      (row) =>
        `- ${row.planDate}: ${row.title || "Untitled plan"}; ${limitText(row.contentMd.replace(/\s+/g, " "), 220)}`,
    ),
  ].join("\n");
}

function formatAnalyses(analyses: Array<typeof schema.analyses.$inferSelect>) {
  if (analyses.length === 0) return "Recent analyses:\n- No saved analyses.";
  return [
    "Recent analyses:",
    ...analyses.map(
      (row) => `- ${row.planDate}: ${limitText(row.contentMd.replace(/\s+/g, " "), 240)}`,
    ),
  ].join("\n");
}

function limitText(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 16)).trimEnd()}... [truncated]`;
}
