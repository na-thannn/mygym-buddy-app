# SMTP Email Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing guest meeting and temporary login SMTP delivery path reliable, tested, and documented.

**Architecture:** Keep `src/server/email.ts` as the mail boundary. Extract SMTP config parsing and transport creation inside that module so routes keep using the current `{ sent, skipped }` result contract.

**Tech Stack:** TanStack Start server routes, Node environment variables, Nodemailer, Vitest.

---

## File Structure

- Modify `src/server/email.ts`: parse SMTP env, build Nodemailer transport, send plain-text email, expose template functions.
- Create `src/server/email.test.ts`: mock Nodemailer and assert mailer behavior.
- Modify `.env.example`: keep SMTP variables accurate and provider-neutral.
- Modify `README.md`: document required SMTP variables, defaults, and common provider notes.

### Task 1: Add Mailer Tests

**Files:**
- Create: `src/server/email.test.ts`
- Read: `src/server/email.ts`

- [ ] **Step 1: Write failing tests**

Create tests that mock `nodemailer.createTransport` and cover missing config, valid config, send failure, and template contents.

- [ ] **Step 2: Run the targeted test**

Run: `npm test -- src/server/email.test.ts --run`

Expected: at least one failure because the current mailer does not expose all desired parsing behavior yet.

### Task 2: Harden SMTP Mailer

**Files:**
- Modify: `src/server/email.ts`
- Test: `src/server/email.test.ts`

- [ ] **Step 1: Implement config parsing**

Add internal parsing so `SMTP_HOST` and `SMTP_FROM` are required, `SMTP_PORT` defaults to `587`, invalid ports skip delivery, `SMTP_SECURE` defaults to `false`, and auth is included only when `SMTP_USER` and `SMTP_PASS` are both present.

- [ ] **Step 2: Keep delivery result behavior**

Return `{ sent: false, skipped: true }` for missing or invalid config, `{ sent: true, skipped: false }` on successful SMTP send, and `{ sent: false, skipped: false }` on SMTP exceptions.

- [ ] **Step 3: Run the targeted test**

Run: `npm test -- src/server/email.test.ts --run`

Expected: all `src/server/email.test.ts` tests pass.

### Task 3: Update SMTP Documentation

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Clarify env values**

Keep the existing keys and clarify that `SMTP_SECURE=true` usually pairs with port `465`, while `SMTP_SECURE=false` usually pairs with port `587`.

- [ ] **Step 2: Document provider setup**

Add concise notes that Gmail usually needs an app password and local testing can use a sandbox SMTP provider.

### Task 4: Verify

**Files:**
- Read: `package.json`

- [ ] **Step 1: Run focused tests**

Run: `npm test -- src/server/email.test.ts --run`

Expected: mailer tests pass.

- [ ] **Step 2: Run broader validation**

Run: `npm test -- --run`

Expected: project tests pass.

- [ ] **Step 3: Check lint if tests pass**

Run: `npm run lint`

Expected: lint exits successfully or any unrelated existing lint failures are reported clearly.
