import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq, gte } from "drizzle-orm";
import { generateText } from "ai";
import { getSessionUser } from "@/server/auth";
import { db, schema } from "@/server/db";
import { FAST_MODEL_ID, getModelProvider, isAiConfigured } from "@/lib/trainer/groq";
import { buildWeeklyStreak, type WeeklyStreak } from "@/lib/customer-experience";
import { saigonDateString } from "@/lib/time";
import logDevError from "@/lib/error-logger";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function shiftDate(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function fallbackMessage(streak: WeeklyStreak): string {
  if (streak.currentStreak >= 3) {
    return `You're on a ${streak.currentStreak}-day streak. Keep the momentum going today.`;
  }
  if (streak.sessionsThisWeek >= 3) {
    return `Strong week with ${streak.sessionsThisWeek} sessions so far. Show up again today.`;
  }
  if (streak.sessionsThisWeek >= 1) {
    return "Good start this week. One more session today keeps you moving forward.";
  }
  return "Today is a great day to begin. Even a short session counts.";
}

export const Route = createFileRoute("/api/today-motivation")({
  server: {
    handlers: {
      GET: async () => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        const userId = session.userId;
        const today = saigonDateString();
        const since = shiftDate(today, -13);

        try {
          const workouts = await db
            .select({ performedAt: schema.workoutLogs.performedAt })
            .from(schema.workoutLogs)
            .where(
              and(
                eq(schema.workoutLogs.userId, userId),
                gte(schema.workoutLogs.performedAt, since),
              ),
            )
            .orderBy(desc(schema.workoutLogs.performedAt));
          const streak = buildWeeklyStreak({ today, workouts });

          const [cached] = await db
            .select({ message: schema.dailyMotivation.message })
            .from(schema.dailyMotivation)
            .where(
              and(
                eq(schema.dailyMotivation.userId, userId),
                eq(schema.dailyMotivation.forDate, today),
              ),
            )
            .limit(1);
          if (cached) {
            return json({ message: cached.message, streak, cached: true });
          }

          let message = fallbackMessage(streak);

          if (isAiConfigured()) {
            try {
              const [profile] = await db
                .select({ goal: schema.profiles.goal, level: schema.profiles.level })
                .from(schema.profiles)
                .where(eq(schema.profiles.userId, userId))
                .limit(1);
              const provider = getModelProvider();
              const prompt = [
                "You are Alex, a warm, concise gym coach.",
                "Write ONE short motivating sentence (max 24 words) for a member's dashboard today.",
                "No emojis, no hashtags, no quotation marks. Speak directly to the member.",
                `Goal: ${profile?.goal || "general fitness"}`,
                `Training level: ${profile?.level || "unknown"}`,
                `Workouts in the last 7 days: ${streak.sessionsThisWeek}`,
                `Current daily streak: ${streak.currentStreak}`,
              ].join("\n");
              const { text } = await generateText({
                model: provider(FAST_MODEL_ID),
                prompt,
                temperature: 0.7,
              });
              const cleaned = text
                .trim()
                .split("\n")[0]
                .replace(/^["']|["']$/g, "")
                .slice(0, 240);
              if (cleaned) {
                message = cleaned;
                await db
                  .insert(schema.dailyMotivation)
                  .values({ userId, forDate: today, message })
                  .onConflictDoNothing();
              }
            } catch (err) {
              await logDevError({
                error: err,
                req: { method: "GET", url: "/api/today-motivation" },
              }).catch(() => {});
            }
          }

          return json({ message, streak, cached: false });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "GET", url: "/api/today-motivation" },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});
