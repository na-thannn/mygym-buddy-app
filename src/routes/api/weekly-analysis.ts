import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, validateSessionToken, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import { generateText } from "ai";
import { getGroq, ALEX_MODEL_ID } from "@/lib/trainer/groq";

type WorkoutLogRow = {
  performedAt: string;
  exercise: string;
  sets: number | null;
  reps: string | null;
  weightKg: number | null;
  muscleGroup: string | null;
  dayLabel: string | null;
};

type ProfileRow = {
  goal: string | null;
  level: string | null;
  limitations: string | null;
  age: number | null;
  weightKg: number | null;
};

const formatYmd = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const parseReps = (value: string | null) => {
  if (!value) return null;
  const nums =
    value
      .match(/\d+(?:\.\d+)?/g)
      ?.map(Number)
      .filter(Number.isFinite) ?? [];
  if (nums.length === 0) return null;
  if (nums.length === 1) return nums[0] ?? null;
  return (nums[0] + nums[1]) / 2;
};

export const Route = createFileRoute("/api/weekly-analysis")({
  server: {
    handlers: {
      POST: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        const daysRaw = Number(bodyObj["days"] ?? 7);
        const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 3), 30) : 7;

        const endDate = new Date();
        const startDate = addDays(endDate, -(days - 1));
        const startYmd = formatYmd(startDate);
        const endYmd = formatYmd(endDate);

        const logs = db
          .select({
            performedAt: schema.workoutLogs.performedAt,
            exercise: schema.workoutLogs.exercise,
            sets: schema.workoutLogs.sets,
            reps: schema.workoutLogs.reps,
            weightKg: schema.workoutLogs.weightKg,
            muscleGroup: schema.workoutLogs.muscleGroup,
            dayLabel: schema.workoutLogs.dayLabel,
          })
          .from(schema.workoutLogs)
          .where(
            and(
              eq(schema.workoutLogs.userId, session.userId),
              gte(schema.workoutLogs.performedAt, startYmd),
              lte(schema.workoutLogs.performedAt, endYmd),
            ),
          )
          .orderBy(desc(schema.workoutLogs.performedAt), desc(schema.workoutLogs.createdAt))
          .all() as WorkoutLogRow[];

        const profile = db
          .select({
            goal: schema.profiles.goal,
            level: schema.profiles.level,
            limitations: schema.profiles.limitations,
            age: schema.profiles.age,
            weightKg: schema.profiles.weightKg,
          })
          .from(schema.profiles)
          .where(eq(schema.profiles.userId, session.userId))
          .get() as ProfileRow | undefined;

        const uniqueDays = new Set(logs.map((log) => log.performedAt));
        const totalVolume = logs.reduce((sum, log) => {
          const sets = log.sets ?? 0;
          const weight = log.weightKg ?? 0;
          const reps = parseReps(log.reps) ?? 0;
          if (!sets || !weight || !reps) return sum;
          return sum + sets * reps * weight;
        }, 0);

        const exerciseCounts = logs.reduce<Record<string, number>>((acc, log) => {
          acc[log.exercise] = (acc[log.exercise] ?? 0) + 1;
          return acc;
        }, {});

        const topExercises = Object.entries(exerciseCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([exercise, count]) => `${exercise} (${count})`);

        const workoutsByDay = Array.from(uniqueDays)
          .sort()
          .map((day) => {
            const count = logs.filter((log) => log.performedAt === day).length;
            return `${day}: ${count} entries`;
          });

        const summary = {
          range: { start: startYmd, end: endYmd },
          sessions: uniqueDays.size,
          totalEntries: logs.length,
          totalVolume: Math.round(totalVolume),
          topExercises,
          workoutsByDay,
        };

        let contentMd = "";
        if (logs.length === 0) {
          contentMd = [
            "## Weekly AI Analysis",
            `No workouts logged between ${startYmd} and ${endYmd}.`,
            "",
            "**Quick wins**",
            "- Log at least 2 sessions next week so I can spot trends.",
            "- Start with simple full-body sessions to rebuild consistency.",
            "",
            "**Next week focus**",
            "- Pick fixed days (e.g. Mon/Thu) and protect the time.",
            "- Track sets, reps, and weight for each exercise.",
            "",
            "You have got this - small steps add up fast.",
          ].join("\n");
        } else {
          let groq;
          try {
            groq = getGroq();
          } catch (err) {
            return new Response(JSON.stringify({ error: "Missing GROQ_API_KEY" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const sys = `You are Alex, a certified personal trainer.
Write a weekly progress analysis in Markdown.
Requirements:
- Use headings: Summary, Wins, Risks, Next Week
- Keep it concise (max 10 bullet points total)
- Call out data gaps if weights/reps are missing
- End with one short motivational sentence
Return Markdown only.`;

          const usr = `User profile:
- Goal: ${profile?.goal || "general fitness"}
- Level: ${profile?.level || "beginner"}
- Limitations: ${profile?.limitations || "none"}
- Age: ${profile?.age ?? "n/a"}
- Weight: ${profile?.weightKg ?? "n/a"} kg

Weekly summary:
${JSON.stringify(summary, null, 2)}

Sample workouts:
${logs
  .slice(0, 20)
  .map(
    (log) =>
      `${log.performedAt} | ${log.exercise} | sets: ${log.sets ?? "-"} | reps: ${log.reps ?? "-"} | weight: ${log.weightKg ?? "-"}`,
  )
  .join("\n")}`;

          try {
            const { text } = await generateText({
              model: groq(ALEX_MODEL_ID),
              messages: [
                { role: "system", content: sys },
                { role: "user", content: usr },
              ],
            });
            contentMd = text.trim() || "## Weekly AI Analysis\nAnalysis unavailable.";
          } catch (err) {
            await logDevError({ error: err, req: null }).catch(() => {});
            return new Response(JSON.stringify({ error: "Server error" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        const id = newId();
        try {
          db.insert(schema.analyses)
            .values({
              id,
              userId: session.userId,
              planDate: endYmd,
              contentMd,
            })
            .run();
          return new Response(JSON.stringify({ ok: true, id, planDate: endYmd }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          await logDevError({ error: err, req: null }).catch(() => {});
          return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
