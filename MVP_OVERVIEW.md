# HL Fitness - Alex AI Trainer MVP Overview

## Project Summary

HL Fitness - Alex AI Trainer is a local MVP for a gym member platform. The project connects the daily fitness journey of members with personal trainers, staff, administrators, and an AI coaching assistant called Alex.

The MVP is designed around one main idea: members should not have to keep their training, nutrition, body composition, bookings, and coach feedback in separate places. Instead, the app creates a connected training loop where members can log what they do, review their progress, ask for AI support, and escalate to a human coach or staff member when needed.

The current project is implemented as a self-hosted local demo using TanStack Start, React, TypeScript, Drizzle ORM, SQLite, AI SDK, and Groq. It can be demonstrated on a laptop with a local database and a Groq API key, without requiring a full cloud deployment.

## MVP Purpose

The purpose of this MVP is to prove that an AI-assisted fitness platform can:

- Help members manage their own training records.
- Give personalised support using saved member context.
- Support trainers and staff with visibility into bookings, clients, and escalated support needs.
- Demonstrate how AI agents and workflow automation could support a real company solution.
- Provide a practical base for researching tools such as Microsoft Copilot Studio, Power Automate flows, custom web applications, and AI tool-calling systems.

## Target Users

### Gym Members

Members use the app to manage their training profile, log workouts, record nutrition, track InBody/body-composition changes, book PT sessions, join group classes, view progress, and chat with Alex AI Coach.

### Personal Trainers

Personal trainers use the app to view assigned clients, manage session requests, check escalated support items, and understand member context before responding.

### Staff

Staff use the system to manage support operations, booking issues, customer lookup, and general gym workflows.

### Administrators

Administrators manage users, roles, PT assignments, dashboard stats, and overall gym operations.

### Guests

Guests can use the public onboarding flow to request an intro meeting before a full member account is created.

## Current MVP Features

### Public Landing Page

The public page introduces HL Fitness and explains the connected member loop: workouts, InBody tracking, nutrition, AI coaching, progress analytics, community, and trainer support.

### Guest Onboarding

The `get-started` flow lets a guest:

- Select a fitness goal.
- Choose an experience level.
- Enter contact details.
- Select a coach and meeting time.
- Submit a guest meeting request.

If the selected trainer is unavailable, the system can assign the first available coach as a fallback.

### Authentication and Roles

The app uses local email/password authentication with secure password hashing and session cookies. Role-based access supports:

- Customer
- Personal trainer
- Staff
- Admin

Temporary login emails and meeting confirmations can be sent through SMTP when configured.

### Member Profile

Members can save personal fitness context such as:

- Goal
- Training level
- Limitations or injuries
- Age
- Gender
- Height
- Current weight
- Target weight

This data is used by Alex AI Coach and other app workflows.

### Workout Logging

Members can log completed exercises with:

- Date
- Day label
- Muscle group
- Exercise name
- Sets
- Reps
- Weight
- Notes

These logs become part of the member's progress history and can be used for later AI analysis.

### Nutrition Logging

Members can record daily nutrition reports with meals, snacks, workout-day meal details, calories, macros, and notes. The app can estimate macros from meal descriptions through the AI/nutrition logic.

### InBody Tracking

Members can enter InBody-style body-composition data such as:

- Weight
- Muscle mass
- Body fat percentage
- Report date

This supports progress tracking beyond body weight alone.

### Progress Reports

The app can track weekly progress signals such as:

- Total sessions
- Training streak
- Total training volume
- Notes

Progress reports help members and coaches review consistency and outcomes over time.

### Training Plans

Members can create or save workout plan documents in Markdown. Alex AI Coach can generate personalised workout plans based on the user's goal, training level, limitations, equipment, and planned schedule.

### AI Analysis

The AI analysis feature compares saved workout plans against actual workout logs and produces feedback. This helps members understand whether they followed their plan and what to adjust next.

### Alex AI Coach

Alex is the AI personal trainer chatbot for HL Fitness members. It uses AI SDK streaming, Groq through an OpenAI-compatible API, and tool calling.

Alex can:

- Collect and save member profile information.
- Read existing profile context.
- Generate workout plans.
- Log workout entries.
- Log nutrition reports.
- Save progress reports.
- Read saved plans.
- Read workouts since a specific date.
- Analyse progress and save the analysis.
- Create human support tickets.
- Read recent nutrition, InBody, progress, and analysis records.

The system prompt limits Alex to fitness, nutrition, gym usage, and HL Fitness support. It also includes safety rules for pain, injury, illness, medication, or medical-risk questions.

### Chat Threads

The chat experience supports multiple conversations. Messages are stored in the database as structured UI message JSON so tool calls and results can be restored.

### Bookings

Members can request PT sessions and view bookings. Booking data supports status, scheduled time, duration, notes, cancellation reason, and cancellation ownership.

### Group Classes

The app supports group class management, scheduled class sessions, class capacity, bookings, attendance, and trainer assignment.

### Community Feed

Members can post community updates, optionally with an image, and track likes.

### Support Tickets

Members and Alex AI Coach can create support tickets when human help is needed. Staff and PT users can review escalated issues.

### Admin Dashboard

The admin dashboard shows operational statistics and allows administrators to:

- View user counts by role.
- Manage user roles.
- Assign customers to PTs.
- Review unassigned customers.
- Review PT client load.
- See bookings, open support tickets, class sessions, and attendance stats.

## Current Technical Architecture

### Front End

- React
- TypeScript
- TanStack Start
- TanStack Router
- React Query
- Tailwind CSS
- Radix UI components
- Framer Motion
- Lucide icons

### Back End

- TanStack Start server routes
- Local Node runtime
- Drizzle ORM
- SQLite through `better-sqlite3`
- Server-side authentication and session handling
- SMTP email delivery with Nodemailer

### AI Layer

- AI SDK v6
- Groq API through an OpenAI-compatible provider
- Streaming chat responses
- Tool calling for profile, plan, workout, nutrition, progress, analysis, and support actions
- Stored chat threads and messages

### Database

The current SQLite schema includes tables for:

- Users
- Sessions
- Profiles
- Workout logs
- Nutrition reports
- Progress reports
- Bookings
- Guest meetings
- PT unavailable days
- Support tickets
- Group classes
- Group class sessions
- Group class bookings
- Workout plan documents
- Analyses
- Chat threads
- Chat messages
- InBody reports
- Community feed
- Progress photos

## MVP User Journey

1. A guest visits the public HL Fitness landing page.
2. The guest submits an intro meeting request through the guided onboarding flow.
3. Staff or a coach can review the request and create or manage the member account.
4. The member signs in and completes their fitness profile.
5. The member logs workouts, nutrition, InBody data, progress reports, and bookings.
6. The member uses Alex AI Coach to generate plans, log entries, ask questions, and analyse progress.
7. If the issue needs human support, Alex or the member creates a support ticket.
8. PTs, staff, and admins use their dashboards to manage clients, bookings, classes, support, and roles.

## Why This MVP Is Useful

This MVP is useful because it demonstrates a complete, realistic product loop instead of only a single chatbot. It shows how AI can be connected to real user records and operational workflows.

The project also gives a practical way to compare different solution approaches:

- A custom-coded full-stack web application.
- AI agent tool calling inside a web app.
- Low-code agents in Microsoft Copilot Studio.
- Workflow automation with Power Automate.
- Human-in-the-loop escalation for sensitive or complex cases.

For placement learning, it is useful because it combines web development, database design, authentication, AI integration, workflow thinking, testing, and technology research.

## Future Implementation Ideas

### 1. Cloud Deployment

The current MVP is a local demo. A future version could move from local SQLite to a cloud-ready database and deployment setup.

Possible work:

- Migrate from local SQLite to PostgreSQL or Supabase.
- Add production environment variables and deployment documentation.
- Configure secure secrets management.
- Add database backups and migration workflows.
- Add proper production logging and monitoring.

### 2. Stronger Data Privacy and Security

Because the app stores health and fitness-related data, privacy and security should become a major focus before production use.

Possible work:

- Add stricter role-based access checks.
- Add audit logs for staff, PT, and admin actions.
- Review what data Alex AI Coach can access.
- Add clear consent text for AI-assisted coaching.
- Add data retention and deletion options.
- Encrypt sensitive data where appropriate.

### 3. Better AI Guardrails

Alex already includes safety rules, but future versions should make the AI layer more reliable and auditable.

Possible work:

- Add structured safety classification before AI responses.
- Add stricter escalation rules for injuries, medical symptoms, or unsafe requests.
- Store AI tool-call audit logs.
- Add automated tests for prompt behavior.
- Add evaluation scripts for common member scenarios.
- Add fallback responses when the AI provider is unavailable.

### 4. Trainer Review Workflow

The AI should support trainers, not replace them. A future version could let trainers review AI-generated plans and analyses before members use them.

Possible work:

- Add "requires trainer review" status for AI-generated plans.
- Let PTs approve, edit, or reject AI recommendations.
- Notify members when a trainer has reviewed their plan.
- Allow trainers to leave comments on workout plans and progress analyses.

### 5. Copilot Studio Agent Prototype

The mentor's task about creating agents in Copilot Studio can become a future research branch of this project.

Possible work:

- Build a simple Copilot Studio agent for member FAQs.
- Build a second agent for staff support triage.
- Compare Copilot Studio with the custom Alex AI Coach implementation.
- Document strengths and limits of Copilot Studio for this company use case.
- Test whether Copilot Studio can connect to the same backend or external APIs.

### 6. Power Automate Flow Integration

Power Automate flows could support business operations around the app.

Possible work:

- Send an email when a guest meeting is created.
- Notify a PT when a new client is assigned.
- Create a staff task when a support ticket is opened.
- Send a weekly progress summary to a member.
- Update a shared spreadsheet or CRM when a new lead submits the onboarding form.

### 7. Calendar Integration

Bookings and guest meetings would be more useful if connected to real calendars.

Possible work:

- Sync PT bookings to Outlook or Google Calendar.
- Prevent double booking by checking real calendar availability.
- Send calendar invites for confirmed sessions.
- Add reminders before PT sessions and group classes.

### 8. Payment and Membership Management

The MVP currently focuses on training and operations, not payments.

Possible work:

- Add membership plans.
- Track subscription status.
- Add payment provider integration.
- Restrict booking or class access based on active membership.
- Generate invoices or payment receipts.

### 9. Mobile-First Experience

Gym members will often use this app on the gym floor, so mobile usability matters.

Possible work:

- Improve mobile workout logging.
- Add quick-add buttons for common exercises.
- Add offline-friendly draft logs.
- Add camera upload for progress photos and InBody reports.
- Consider a PWA install flow.

### 10. Progress Analytics Dashboard

The project already stores useful progress data. A stronger analytics dashboard could make that data easier to understand.

Possible work:

- Add charts for weight, muscle mass, body fat, and training volume.
- Show weekly consistency trends.
- Compare planned sessions against completed sessions.
- Highlight plateaus or sudden changes.
- Generate PDF progress reports for members and coaches.

### 11. Exercise and Nutrition Knowledge Base

Future versions could add structured content instead of relying only on free-text entries.

Possible work:

- Add an exercise library.
- Add muscle group, equipment, and difficulty metadata.
- Add standard nutrition templates.
- Add reusable meal examples.
- Let Alex recommend from approved internal content.

### 12. Testing and Quality Improvements

The app already has Vitest test files in several areas. More coverage would make future changes safer.

Possible work:

- Add tests for all server routes.
- Add tests for role access rules.
- Add chat tool-call tests for Alex.
- Add booking and group class edge-case tests.
- Add end-to-end tests for guest onboarding and member logging.

### 13. Company Solution Research

For placement, this project can support broader research into which technology should be used for different business problems.

Possible comparison criteria:

- Development speed
- Cost
- Maintainability
- Security
- Integration with existing company tools
- Flexibility
- AI capability
- Ease of handover to non-developer staff

Possible tools to compare:

- Custom React/TanStack application
- Microsoft Copilot Studio
- Power Automate
- Supabase
- PostgreSQL
- SharePoint or Microsoft Lists
- CRM systems
- AI SDK-based custom agents

## Suggested Next Milestones

### Milestone 1: Stabilise Current MVP

- Confirm all core user flows work locally.
- Clean up environment setup instructions.
- Ensure demo seed data exists for admin, PT, staff, and customer roles.
- Run and fix existing tests.

### Milestone 2: Improve AI Reliability

- Add more AI evaluation cases.
- Test common member requests.
- Add stricter support escalation rules.
- Improve prompt and tool descriptions.

### Milestone 3: Build Automation Prototypes

- Create one Copilot Studio FAQ/support agent.
- Create one Power Automate guest-meeting notification flow.
- Compare both with the custom app implementation.

### Milestone 4: Prepare for Real Deployment

- Choose a production database.
- Review privacy and security.
- Add monitoring and backups.
- Prepare a deployment guide.

## Placement Learning Connection

This project supports placement learning because it is not only a coding task. It also involves researching suitable tools, comparing implementation approaches, asking a mentor for feedback, and understanding how a technical solution fits a company problem.

During the internship, useful learning actions include:

- Researching tools and technologies that may fit the company's solution.
- Creating small Copilot Studio agents and Power Automate flows.
- Re-implementing solved problems to understand the solution deeply.
- Asking the mentor about technical decisions, workplace practices, and unclear university concepts.
- Keeping short notes about tasks, blockers, solutions, and lessons learned.

## Professional Inquiry Question

How can an AI-assisted fitness platform combine automated coaching, workflow automation, and human oversight to improve member engagement while protecting user safety and privacy?

This question connects the MVP with future implementation work because it encourages comparison between custom AI tools, Copilot Studio agents, Power Automate flows, and human-in-the-loop workflows.
