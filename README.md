# HL Fitness — Alex AI Trainer (Local Demo)

A self-hosted, single-file SQLite demo of an AI personal trainer agent.
Built with TanStack Start, Drizzle ORM, AI SDK v6, and the Groq API
(free tier, `llama-3.3-70b-versatile`).

## Run locally

```bash
npm install
echo 'GROQ_API_KEY=gsk_your_key_here' > .env.local
npm run dev
```

Then open http://localhost:5173.

The SQLite database is created automatically at `./data/app.db` on first
boot. To reset everything, delete that file.

## Architecture

- **DB**: `better-sqlite3` + Drizzle, schema in `src/server/schema.ts`,
  auto-migrated on boot in `src/server/db.ts`.
- **Auth**: local email + password, scrypt-hashed, session cookie
  (`src/server/auth.ts`, `src/lib/auth.functions.ts`).
- **AI**: Groq via OpenAI-compatible endpoint
  (`src/lib/trainer/groq.ts`), agentic tool calling with 9 tools
  (`src/lib/trainer/tools.ts`).
- **Chat**: `/api/chat` server route streams `streamText` with
  `stopWhen: stepCountIs(50)`. UI at `/trainer` uses `@ai-sdk/react`
  `useChat`.

## Notes

- This project replaced the original Supabase cloud setup with a fully
  local stack so it can be demonstrated on a laptop without external
  services besides the Groq API.
- Note: the in-browser cloud preview will not work because `better-sqlite3`
  is a native Node addon and cannot run in the Cloudflare Worker SSR
  runtime — run locally with `npm run dev`.
