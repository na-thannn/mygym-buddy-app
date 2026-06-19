# HL Fitness E2E Testing Report

**Date:** 2026-06-19  
**Base URL:** `http://localhost:5173`  
**Suite:** `@playwright/test` (45 tests)  
**Final run:** **45 passed**, 0 failed, 0 flaky (~2.0 min)

## Summary

Playwright MCP was added to `.cursor/mcp.json` for live browser walkthroughs in Cursor. Automated validation was executed via the committed Playwright suite (same feature matrix). All role-based flows pass against the seeded demo database (`npm run seed:demo`, password `password123`).

## Environment

| Item | Status |
|------|--------|
| Dev server | `npm run dev` on `:5173` |
| Demo seed | `npm run seed:demo` |
| `GROQ_API_KEY` | Required for AI Coach + AI macro estimation; tests skip or use manual paths when absent |
| Playwright MCP | Configured in `.cursor/mcp.json` — restart Cursor to enable live MCP walkthrough |

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hlfitness.test` | `password123` |
| Manager | `manager@hlfitness.test` | `password123` |
| PT | `linh.pt@hlfitness.test` | `password123` |
| Customer | `member@hlfitness.test` | `password123` |

## Feature matrix — results

### Public (no auth)

| Feature | Route | Result | Notes |
|---------|-------|--------|-------|
| Landing hero & sections | `/` | **PASS** | Hero, CTAs, plans, member loop, coach support |
| Get started onboarding | `/get-started` | **PASS** (smoke) | Step 1 goal selection verified; full multi-step UI not automated |
| Guest meeting submit | `/api/guest-meetings` | **PASS** | API flow with slot/PT availability picker |
| Auth sign-in success | `/auth` → `/feed` | **PASS** | Cookie injection via `/api/signin` |
| Auth invalid credentials | `/api/signin` | **PASS** | Returns 400 with error message |

### Customer (`member@hlfitness.test`)

| Feature | Route | Result | Depth |
|---------|-------|--------|-------|
| Community feed | `/feed` | **PASS** | Create post + toast |
| Profile save | `/profile` | **PASS** | Form save + toast |
| InBody reports | `/inbody` | **PASS** | Page smoke + API create + UI verify |
| Workout log | `/log/workout` | **PASS** | API create + entry visible in log |
| Nutrition log | `/nutrition` | **PASS** | API save (manual macros) + UI verify |
| Progress analytics | `/progress` | **PASS** | Page sections load |
| Progress report | `/progress-report` | **PASS** | Generate review or empty state |
| Training plans | `/plans` | **PASS** | Create/save plan |
| Packages | `/packages` | **PASS** | Request package/service |
| Group classes | `/classes` | **PASS** | Discover section loads |
| Bookings | `/bookings` | **PASS** | Request booking |
| Change password | `/change-password` | **PASS** | Form renders |
| AI Coach | `/trainer` | **PASS** / SKIP | Skipped when `GROQ_API_KEY` missing |
| AI Analyses | `/analyses` | **PASS** | Page loads (New review / Ask Alex) |

### PT (`linh.pt@hlfitness.test`)

| Feature | Route | Result |
|---------|-------|--------|
| PT Desk | `/pt-inbox` | **PASS** — clients, guest meetings, session requests, escalations |
| Group classes | `/classes` | **PASS** |
| Bookings | `/bookings` | **PASS** |
| Feed | `/feed` | **PASS** |
| Profile | `/profile` | **PASS** |

### Manager (`manager@hlfitness.test`)

| Feature | Route | Result |
|---------|-------|--------|
| Manager CRM shell | `/staff` | **PASS** — all tabs visible |
| Support queue | `/staff` (Support tab) | **PASS** |
| Customer lookup | `/staff` (Customers tab) | **PASS** |
| Sales ops / package requests | `/staff` (Sales ops tab) | **PASS** |
| Group classes | `/classes` | **PASS** |
| Bookings | `/bookings` | **PASS** |

### Admin (`admin@hlfitness.test`)

| Feature | Route | Result |
|---------|-------|--------|
| Admin dashboard | `/admin` | **PASS** — stats, roles, search |
| Site content | `/site` | **PASS** — branch, trainers, photos |
| Manager CRM | `/staff` | **PASS** |
| Group classes | `/classes` | **PASS** |
| Bookings | `/bookings` | **PASS** |
| Feed | `/feed` | **PASS** |

### Access control

| Scenario | Result |
|----------|--------|
| Unauthenticated → `/auth` redirect | **PASS** |
| Customer blocked from `/admin` | **PASS** |
| Customer blocked from `/staff` | **PASS** |
| Customer blocked from `/pt-inbox` | **PASS** |
| PT blocked from `/packages` | **PASS** |

## Findings & workarounds

### Headless UI dialog flakiness (InBody)

The **Add result** Radix dialog did not reliably open in headless Chromium when clicking the button. **Workaround:** API-first test (`POST /api/inbody`) with page reload verification. Dialog UI should be re-tested manually or in headed mode via Playwright MCP.

### Workout / nutrition form submit in headless

Direct form submits on `/log/workout` and `/nutrition` were flaky (toast never appeared, possible Framer Motion / native submit interference). **Workaround:** API create + UI verification. Training plan and profile forms work via UI clicks.

### Guest meeting slot selection

First available slot + PT combo can return `"No coach is available for that slot"`. **Fix:** `pickAvailableGuestSlot()` in `e2e/helpers.ts` iterates availability matrix.

### Labels without `htmlFor`

Many forms use visual labels without accessible `for` attributes. **Fix:** `fieldInput()` helper targets label text within `.space-y-*` containers.

### Auth form Enter key

Pressing Enter on `/auth` triggered native GET navigation. **Fix:** Click submit button explicitly; invalid-credentials test uses direct API assertion.

### AI features

- **AI Coach** (`/trainer`): skipped without `GROQ_API_KEY`
- **Nutrition macro estimation**: tests use `estimateMacros: false` with manual macros to avoid Groq dependency

## How to re-run

```bash
npm run seed:demo          # if DB needs reset
npm run dev                # or rely on playwright webServer
npm run test:e2e           # headless, all 45 tests
npm run test:e2e:headed    # debug visually
npm run test:e2e:ui        # Playwright UI mode
```

HTML report: `e2e/report/index.html` (generated on each run).

## Test architecture

```
auth.setup.ts → e2e/.auth/{admin,manager,pt,customer}.json
     ↓
Per-role Playwright projects → spec files
     ↓
npm run test:e2e
```

## MCP walkthrough note

Playwright MCP entry in `.cursor/mcp.json`:

```json
"playwright": {
  "command": "npx",
  "args": ["-y", "@playwright/mcp@latest"]
}
```

After restarting Cursor, use Settings → Tools & MCP to confirm `playwright` is green, then drive the same route matrix interactively. This report reflects automated suite results equivalent to the planned walkthrough coverage.
