# HL Fitness — Social Training Platform (MVP)

A Vietnamese, minimal social-app style web platform for the HL Fitness branch at 303 Lê Thanh Nghị, Đà Nẵng. Members track body progress, log workouts/meals, share to a gym feed, and chat with an AI coach that can escalate to an on-duty PT.

## Roles
- **User (Member)** — default on signup.
- **PT / Staff** — admin-approved only. Granted via an Admin panel; PTs can answer escalated chats and post to the feed.
- **Admin** — bootstrap role to approve PTs (single seeded admin to start).

Roles stored in a dedicated `user_roles` table with a `has_role()` SECURITY DEFINER function (no roles on profiles).

## Core features (v1)

1. **Auth & profile**
   - Email/password + Google sign-in (Lovable Cloud).
   - Profile: tên, ảnh đại diện, giới tính, ngày sinh, chiều cao, cân nặng mục tiêu, mục tiêu tập, bio.
2. **InBody tracking**
   - Upload InBody result (image or PDF) + manual entry of key metrics (weight, body fat %, skeletal muscle mass, BMI, visceral fat).
   - History timeline + progress charts (weight, body fat, muscle mass over time).
3. **Workout & nutrition logging**
   - Workout log: exercise, sets, reps, weight, notes, date.
   - Meal log: bữa, món, calo, macros (P/F/C), photo optional.
   - Daily/weekly summary + simple charts.
4. **Social feed (branch-only)**
   - Post text + photo, like, comment.
   - Optional "share progress" — attach an InBody comparison or PR.
   - Feed scoped to the HL 303 Lê Thanh Nghị branch.
5. **AI Coach chatbot**
   - General fitness/nutrition Q&A in Vietnamese.
   - Personalized: reads the user's profile, latest InBody, recent workouts/meals as context.
   - Generates saveable weekly workout plans (stored as a structured plan the user can view/check off).
   - Escalation: user taps "Nhờ PT hỗ trợ" or AI auto-suggests escalation → creates a support thread routed to PTs currently marked "online".
6. **PT fallback / live chat**
   - PT dashboard: list of open support threads, online/offline toggle, reply UI.
   - User sees PT replies in the same chat surface (AI messages vs PT messages clearly labeled).

## Pages / routes

```
/                       Landing (branch info, hero, CTA login)
/login, /signup         Auth
/feed                   Social feed (auth)
/profile/me, /profile/:id
/inbody                 Upload + history + charts
/log/workout            Workout logging + history
/log/nutrition          Meal logging + history
/progress               Combined analytics dashboard
/coach                  AI chat (with escalate button)
/pt                     PT dashboard (PT role only)
/admin                  Approve PT requests (admin only)
```

## Visual direction
Vietnamese UI, clean minimal social-app aesthetic (Strava/Instagram-like): light background, generous whitespace, soft cards, single accent color (warm orange/red), rounded photos, charts as the visual hero. Mobile-first.

## Technical details

- **Stack:** TanStack Start + Tailwind + shadcn (already scaffolded). Lovable Cloud for DB/auth/storage. Lovable AI Gateway for the coach (default model `google/gemini-3-flash-preview`).
- **DB tables:**
  - `profiles` (id → auth.users, display_name, avatar_url, dob, gender, height_cm, target_weight_kg, goal, bio)
  - `user_roles` (user_id, role enum: admin|pt|user) + `has_role()` function
  - `pt_applications` (user_id, status, requested_at) for admin approval flow
  - `inbody_entries` (user_id, measured_at, weight_kg, body_fat_pct, skeletal_muscle_kg, bmi, visceral_fat, file_url, notes)
  - `workout_logs` (user_id, performed_at, exercise, sets, reps, weight_kg, notes)
  - `meal_logs` (user_id, eaten_at, meal_type, name, calories, protein_g, fat_g, carbs_g, photo_url)
  - `posts` (user_id, content, image_url, kind: text|progress|pr)
  - `post_likes` (post_id, user_id), `post_comments` (post_id, user_id, content)
  - `coach_threads` (user_id, escalated_at, assigned_pt_id, status)
  - `coach_messages` (thread_id, sender_role: user|ai|pt, sender_id, content)
  - `pt_presence` (user_id, is_online, last_seen_at)
- **Storage buckets:** `avatars` (public), `inbody` (private, owner-read), `posts` (public), `meals` (public).
- **RLS:** Owner-only read/write for personal logs and InBody. Feed posts readable to authenticated members. Coach threads readable to thread owner + assigned PT + any PT when unassigned. Admin/PT actions gated via `has_role()`.
- **AI coach:** TanStack server function calling Lovable AI Gateway. System prompt in Vietnamese; fetches user context (profile, latest InBody, last 7 days logs) server-side before each call. Returns markdown; rendered with `react-markdown`. Workout-plan generation uses tool-calling for structured output saved into a `workout_plans` table.
- **Escalation:** When user taps escalate (or AI returns an escalate signal), mark the thread `status=escalated`, notify PTs via Supabase Realtime on `coach_threads`. PTs subscribe in their dashboard.
- **Realtime:** Supabase Realtime on `coach_messages`, `coach_threads`, `posts`, `post_comments` for live updates.
- **Validation:** Zod on all server functions and forms.

## Build order
1. Enable Lovable Cloud, set up auth (email + Google), profiles table, roles table, admin seed.
2. Landing + auth pages, Vietnamese branding for HL Fitness 303 Lê Thanh Nghị.
3. Profile page + InBody upload/history/charts.
4. Workout + nutrition logging + progress dashboard.
5. Social feed (posts, likes, comments) with image upload.
6. AI coach chat with personalized context + workout plan generation.
7. PT escalation flow + PT dashboard + admin PT-approval panel.
8. Polish, mobile QA, empty states, Vietnamese microcopy pass.

## Out of scope for v1 (can add later)
PT booking/scheduling, payments/memberships, push notifications, multi-branch support, English toggle, friend system / DMs between members.
