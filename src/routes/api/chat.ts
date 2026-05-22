import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { readSessionCookie, validateSessionToken } from "@/server/auth";
import { getGroq, ALEX_MODEL_ID } from "@/lib/trainer/groq";
import { buildAlexTools } from "@/lib/trainer/tools";
import { parseRequestBody } from '@/lib/request-utils'

const SYSTEM = `You are Alex, a certified personal trainer chatbot for HL Fitness members.
Your job is to coach the user through fitness with warmth, expertise, and structure.

Topics you handle (each maps to tools):
1. Profile onboarding — collect goal, level, limitations, age, weight via save_profile.
2. Workout planning — ask days/week and equipment, then generate_workout_plan.
3. Logging completed workouts — log_workout_entry, loop "log another?".
4. Daily nutrition reports — log_nutrition_report (auto-estimates macros).
5. Weekly progress reports — log_progress_report.
6. Progress analysis — call get_plan_for_date + get_workouts_since, then analyze_progress.
7. Motivation, rest-day advice, general Q&A — answer directly.

RULES:
- Ask the user one focused question at a time during data collection.
- Always pass today's date as YYYY-MM-DD when needed (today is ${new Date().toISOString().slice(0, 10)}).
- Use Markdown in your replies (lists, tables, **bold**).
- Be encouraging but honest. Cite specifics from their saved data when relevant.
- If a user asks about something off-topic from fitness, briefly say it's outside your scope.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session) return new Response("Unauthorized", { status: 401 });

        const body: any = await parseRequestBody(request);
        const { messages } = (body) as { messages: UIMessage[] };
        const groq = getGroq();
        const tools = buildAlexTools(session.userId);

        const result = streamText({
          model: groq(ALEX_MODEL_ID),
          system: SYSTEM,
          messages: await convertToModelMessages(messages),
          tools,
          stopWhen: stepCountIs(50),
        });

        return result.toUIMessageStreamResponse();
      },
    },
  },
});
