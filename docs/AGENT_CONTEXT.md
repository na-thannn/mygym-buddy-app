# Agent Context

Last updated: 2026-06-11

## Low-Token Workflow

- Start with `agentmemory` recall for `hl-fitness-mvp`, `alex-ai-trainer`, `graphify-code-graph`, and `guest-meetings`.
- Use `graphify query "<question>" --budget 1000` before broad source reads.
- Use `graphify explain "<symbol-or-concept>"` for focused orientation.
- Run `graphify update .` after code changes. This is AST-only and does not call an LLM.
- Read `MVP_OVERVIEW.md` for product scope before reading routes one by one.

## Current Implementation Snapshot

This working tree represents the HL Fitness / Alex AI Trainer MVP. It is a TanStack Start, React, TypeScript, Drizzle, and local database app for a gym member platform with customer, personal trainer, staff, and admin workflows.

Implemented areas include:

- Public landing page and guest onboarding through `src/routes/index.tsx` and `src/routes/get-started.tsx`.
- Local email/password auth, secure sessions, signup/password policy helpers, and role access checks.
- Member profile, workout logs, nutrition reports, InBody entries, progress reports, bookings, classes, and feed workflows.
- Staff/admin screens and API endpoints for users, stats, customers, support, PT availability, purchase/package requests, and operational lookup flows.
- Alex AI trainer chat support with context building, prompts, chat storage, Groq integration, and tool-calling helpers.
- Drizzle config, generated migration, schema updates, demo seed script, and email support.
- Tests around roles, auth input, signup/password policy, CRM/customer experience, guest meetings, trainer chat/context/prompts/tools, app nav, and email.

## Generated Context

Graphify generated a local code graph in `graphify-out/`:

- Nodes: 2414
- Edges: 3633
- Communities: 197
- Extraction cost: 0 LLM input tokens, 0 LLM output tokens
- Benchmark: about 8.7x fewer tokens per average query than rereading the corpus

`graphify-out/` is intentionally ignored by git.
