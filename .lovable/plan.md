## Goal

Recreate the exported Copilot Studio "Personal Gym Trainer" agent as a local-first web app:

- **DB**: SQLite (`better-sqlite3`) via Drizzle ORM, file at `./data/app.db`
- **Auth**: local email+password using Lucia-style sessions (httpOnly cookie + sessions table)
- **AI**: Groq API (`llama-3.3-70b-versatile`) via OpenAI-compatible endpoint, your own `GROQ_API_KEY`
- **UX**: chat-first "Alex" trainer at `/trainer` that drives the conversation with tool calls, exactly like Copilot Studio. Form pages stay as a fallback.

## Reality checks before you confirm

1. **Lovable preview will stop working after this rewrite.** `better-sqlite3` is a native Node addon that cannot run on Cloudflare Workers. To demo, you run `bun install && bun run dev` on your laptop and show `http://localhost:3000`. The Lovable cloud preview URL will 500.
2. **You answered "Keep everything" earlier.** Feed, PT booking, Admin, InBody, coach threads etc. were Supabase-specific (RLS + storage + realtime). Faithfully porting all of that to SQLite triples the work and isn't part of the agent. **Recommendation: keep only what the agent covers** (Profile, Workout Plan, Log Workout, Log Nutrition, Progress, Analyses, Trainer chat). I'll proceed this way unless you say otherwise — Feed/PT/Admin/InBody/Coach will be deleted.
3. **Supabase wiring stays installed but unused** during the migration. We won't touch `src/integrations/supabase/*` files (Lovable manages them); we just stop importing them.

## What we build (mirrors the agent 1:1)

### Topics → routes/tools

| Agent topic                                       | Implementation                                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| ConversationStart / Greeting (profile setup)      | Tool `save_profile` + chat flow asks goal, level, limitations, age, weight, height          |
| GenerateAndSaveWorkoutPlan                        | Tool `generate_workout_plan` → Groq → save Markdown to `workout_plan_docs` keyed by date    |
| ExportWorkoutPlan (log session, loops)            | Tool `log_workout_entry`, chat asks again "log another?"                                    |
| ExportNutritionAdviceTopic (+ Estimate Macros AI) | Tool `log_nutrition_report` → second Groq call to estimate macros → save                    |
| ExportUserProgressTopic                           | Tool `log_progress_report`                                                                  |
| CompareProgresstoPlan (+ Analyse Progress AI)     | Tools `get_plan_md` + `get_recent_workouts` + `analyze_progress` → save `.md` to `analyses` |
| MotivationBoost / RestDayAdvice                   | Tools with the 4 canned options each (from the export)                                      |
| Fallback / general fitness Q&A                    | Default model behavior                                                                      |

### Form pages (kept as backup UI, simplified)

- `/profile` — edit profile
- `/plans` — list saved `workout_plan_docs` (Markdown)
- `/analyses` — list saved analyses
- `/log/workout`, `/log/nutrition-report`, `/progress-report` — direct entry
- `/trainer` — primary chat surface

## Technical plan

### Dependencies to add

- `better-sqlite3`, `drizzle-orm`, `drizzle-kit`
- `@oslojs/crypto`, `@oslojs/encoding` (session token hashing)
- `@ai-sdk/openai-compatible`, `ai`, `@ai-sdk/react`, `zod`
- `react-markdown`, `remark-gfm`
- AI Elements components for the chat UI

### Files

```text
data/app.db                       SQLite file (gitignored)
src/server/db/
  schema.ts                       Drizzle tables (users, sessions, profiles, workout_logs, ...)
  client.ts                       better-sqlite3 + drizzle instance (server-only)
  migrate.ts                      runs on dev startup
src/server/auth/
  session.ts                      createSession, validateSession, invalidateSession
  password.ts                     hash/verify with scrypt
  middleware.ts                   requireAuth server-fn middleware reading session cookie
src/lib/
  auth.functions.ts               signUp, signIn, signOut, getCurrentUser
  profile.functions.ts            getProfile, saveProfile
  workout.functions.ts            logEntry, listRecent
  nutrition.functions.ts          saveReport (+ Groq macro estimate)
  progress.functions.ts           saveReport
  plans.functions.ts              savePlan, listPlans, getPlan (Markdown CRUD)
  analyses.functions.ts           saveAnalysis, listAnalyses
  trainer/
    groq.ts                       createGroq() helper, baseURL https://api.groq.com/openai/v1
    tools.ts                      AI SDK tool definitions calling the server fns above
src/routes/api/chat.ts            streamText route used by /trainer
src/routes/_authenticated/
  trainer.tsx                     PrimaryChat (AI Elements)
  profile.tsx, plans.tsx, ...     existing forms, ported to new server fns
src/lib/auth.tsx                  rewritten AuthProvider (calls auth.functions, no Supabase)
```

### AI client

```ts
// src/lib/trainer/groq.ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
export const groq = createOpenAICompatible({
  name: "groq",
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY!,
});
export const ALEX_MODEL = groq("llama-3.3-70b-versatile");
```

### System prompt (from the export)

Use Alex's responseInstructions verbatim: encouraging tone, plans in tables, nutrition in bullets, redirect injuries to physio. Injects current profile into the system message so tools have context.

### Tool calling loop

`streamText` with `stopWhen: stepCountIs(50)`, tools defined per-flow. The chat is the agent — tools persist data, model writes the prose.

### Files to delete (agent has no equivalent)

`src/routes/_authenticated/{admin,coach,feed,inbody,pt,log.nutrition,log.workout}.tsx` will be either deleted or rewritten. AppLayout nav stripped.

### Migration order

1. Add deps + scaffold `src/server/db` and `src/server/auth` (no UI change yet)
2. Add `GROQ_API_KEY` secret
3. Rewrite `auth.tsx` + `/auth` route to use local sessions
4. Port form pages one-by-one to new server fns (Profile first)
5. Build `/trainer` chat with full tool set
6. Delete unused pages, clean nav
7. README with `bun install && bun run dev` instructions for your professor

## What you must accept

- ☐ Lovable preview URL won't work after this; you demo by running locally
- ☐ Feed, PT booking, Admin, InBody, Coach pages are deleted (overrides your "keep everything" answer — the agent doesn't have them)
- ☐ Existing Supabase data is abandoned (the SQLite DB starts empty)
- ☐ I'll request `GROQ_API_KEY` via the secrets form once you approve

Reply "go" and I'll start with step 1. If you'd rather keep Lovable Cloud + just swap AI to Groq (Option A from before, much smaller), say so now — last chance to switch.
