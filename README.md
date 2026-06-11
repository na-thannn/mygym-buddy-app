# HL Fitness CRM + Alex AI (Local Demo)

A local Postgres CRM demo for HL Fitness with manager operations, PT service
updates, customer package requests, public landing content, and Alex AI member
support. It is built with TanStack Start, Drizzle ORM, AI SDK v6, and Groq through
an OpenAI-compatible API.

## Run locally

```bash
npm install
copy .env.example .env
docker compose up -d
npm run db:migrate
npm run seed:demo
npm run dev
```

Then open http://localhost:5173.

Local environment variables are read from `.env` by the npm scripts. Start from
`.env.example`, then add a real `GROQ_API_KEY` for Alex AI features. SMTP settings
can stay blank for local demos.

The local database runs in Docker Postgres using `DATABASE_URL` from `.env`. To
reset the local demo, recreate the Docker volume, run `npm run db:migrate`, then
run `npm run seed:demo` again.

## Demo accounts

All seeded accounts use the password `password123`.

| Role     | Email                        |
| -------- | ---------------------------- |
| Admin    | `admin@hlfitness.test`       |
| Manager  | `manager@hlfitness.test`     |
| PT       | `linh.pt@hlfitness.test`     |
| PT       | `minh.pt@hlfitness.test`     |
| Customer | `member@hlfitness.test`      |

The demo data includes public packages, PT services, promotions, events, PT
profiles, a customer membership, a package request, and a manual payment record.

## Email delivery

Meeting confirmations and temporary login emails are sent through SMTP only when
`SMTP_HOST` and `SMTP_FROM` are set. Optional settings are `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASS`. `APP_BASE_URL` controls the login link
included in temporary password emails.

`SMTP_PORT` defaults to `587`, and `SMTP_SECURE` defaults to `false`. Use
`SMTP_SECURE=false` for most port `587` providers that upgrade with STARTTLS. Use
`SMTP_SECURE=true` with port `465`.

If SMTP is not configured or delivery fails, the app still saves the local request so
the demo flow can continue.

Provider notes:

- Gmail usually requires `SMTP_HOST=smtp.gmail.com` and an app password.
- Sandbox providers such as Mailtrap are useful for local testing because they
  capture outgoing mail without sending it to real users.

## Architecture

- **DB**: Docker Postgres and Drizzle, schema in `src/server/schema.ts`,
  migrations in `drizzle/`, and local migration scripts in `package.json`.
- **Auth**: local email and password, scrypt-hashed, session cookie
  (`src/server/auth.ts`, `src/lib/auth.functions.ts`).
- **AI**: Groq via OpenAI-compatible endpoint (`src/lib/trainer/groq.ts`), with
  agentic tool calling in `src/lib/trainer/tools.ts`.
- **Chat**: `/api/chat` streams `streamText`; `/trainer` uses `@ai-sdk/react`
  `useChat` and stored chat threads.

## Notes

- Payments are manual CRM records only; no checkout provider is connected.
- The provided Google Maps and Facebook links should be added to the seeded branch
  data once they are verified.
