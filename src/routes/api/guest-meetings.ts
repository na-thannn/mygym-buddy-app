import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";
import {
  canProvisionGuestLogin,
  generateFixedMeetingSlots,
  generateTemporaryPassword,
  getSaigonDate,
  selectPtForGuestMeeting,
} from "@/lib/guest-meetings";
import { parseRequestBody } from "@/lib/request-utils";
import { hasAnyRole } from "@/lib/roles";
import { db, schema } from "@/server/db";
import { getSessionUser, hashPassword, newId } from "@/server/auth";
import { sendGuestMeetingConfirmationEmail, sendTemporaryPasswordEmail } from "@/server/email";
import logDevError from "@/lib/error-logger";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: z.string().trim().min(3).max(40),
  goal: z.string().trim().min(1).max(80),
  experience: z.enum(["Beginner", "Intermediate", "Advanced"]),
  requestedPtId: z.string().min(1),
  scheduledAt: z.string().datetime(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["complete", "cancel", "reassign", "send-login"]),
  ptId: z.string().min(1).optional(),
});

const activeBookingStatuses = new Set(["pending", "rescheduled", "confirmed"]);

export const Route = createFileRoute("/api/guest-meetings")({
  server: {
    handlers: {
      GET: async () => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);

        const rows = hasAnyRole(session, ["admin", "manager"])
          ? await db
              .select()
              .from(schema.guestMeetings)
              .orderBy(desc(schema.guestMeetings.scheduledAt))
              .limit(300)
          : session.role === "pt"
            ? await db
                .select()
                .from(schema.guestMeetings)
                .where(eq(schema.guestMeetings.assignedPtId, session.userId))
                .orderBy(desc(schema.guestMeetings.scheduledAt))
                .limit(300)
            : [];

        return json({ meetings: rows });
      },
      POST: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const body = await parseRequestBody(request as unknown);
        const parsed = createSchema.safeParse(body);
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
        const data = parsed.data;

        if (!generateFixedMeetingSlots().includes(data.scheduledAt)) {
          return json({ error: "Please choose one of the available meeting slots" }, 400);
        }

        try {
          const pts = await getPts();
          const requestedPt = pts.find((pt) => pt.id === data.requestedPtId);
          if (!requestedPt) return json({ error: "Selected coach is not available" }, 400);

          const selection = selectPtForGuestMeeting({
            requestedPtId: data.requestedPtId,
            scheduledAt: data.scheduledAt,
            pts,
            existingBookings: await getActiveBookings(),
            existingGuestMeetings: await getGuestMeetingSlots(),
            unavailableDays: await getUnavailableDaysForDate(getSaigonDate(data.scheduledAt)),
          });
          if (!selection) return json({ error: "No coach is available for that slot" }, 409);

          const assignedPt = pts.find((pt) => pt.id === selection.assignedPtId);
          if (!assignedPt) return json({ error: "Assigned coach not found" }, 500);

          const id = newId();
          await db
            .insert(schema.guestMeetings)
            .values({
              id,
              guestName: data.name,
              guestEmail: data.email,
              guestPhone: data.phone,
              goal: data.goal,
              experience: data.experience,
              requestedPtId: data.requestedPtId,
              assignedPtId: selection.assignedPtId,
              scheduledAt: data.scheduledAt,
              usedFallback: selection.usedFallback ? 1 : 0,
              status: "confirmed",
            });

          const email = await sendGuestMeetingConfirmationEmail({
            to: data.email,
            guestName: data.name,
            coachName: assignedPt.displayName,
            scheduledAt: data.scheduledAt,
          });
          const now = new Date().toISOString();
          await db
            .update(schema.guestMeetings)
            .set({
              status: email.sent ? "confirmed" : "email_failed",
              confirmationEmailSentAt: email.sent ? now : null,
              updatedAt: now,
            })
            .where(eq(schema.guestMeetings.id, id));

          return json({
            ok: true,
            id,
            status: email.sent ? "confirmed" : "email_failed",
            emailSent: email.sent,
            assignedPtId: selection.assignedPtId,
            assignedPtName: assignedPt.displayName,
            usedFallback: selection.usedFallback,
          });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/guest-meetings" },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
      PATCH: async (ctx: unknown) => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const body = await parseRequestBody(request as unknown);
        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
        const data = parsed.data;

        const [meeting] = await db
          .select()
          .from(schema.guestMeetings)
          .where(eq(schema.guestMeetings.id, data.id))
          .limit(1);
        if (!meeting) return json({ error: "Guest meeting not found" }, 404);
        const isOps = hasAnyRole(session, ["admin", "manager"]);
        const isAssignedPt = session.role === "pt" && meeting.assignedPtId === session.userId;
        if (!isOps && !isAssignedPt) return json({ error: "Forbidden" }, 403);

        if (data.action === "complete") {
          return await updateMeeting(data.id, { status: "completed" });
        }
        if (data.action === "cancel") {
          return await updateMeeting(data.id, { status: "cancelled" });
        }
        if (data.action === "reassign") {
          if (!isOps) return json({ error: "Only managers can reassign guest meetings" }, 403);
          if (!data.ptId) return json({ error: "ptId required" }, 400);
          const target = (await getPts()).find((pt) => pt.id === data.ptId);
          if (!target) return json({ error: "PT not found" }, 400);
          const selection = selectPtForGuestMeeting({
            requestedPtId: data.ptId,
            scheduledAt: meeting.scheduledAt,
            pts: [{ id: target.id, displayName: target.displayName }],
            existingBookings: await getActiveBookings(),
            existingGuestMeetings: (await getGuestMeetingSlots()).filter(
              (slot) => slot.id !== meeting.id,
            ),
            unavailableDays: await getUnavailableDaysForDate(getSaigonDate(meeting.scheduledAt)),
          });
          if (!selection) return json({ error: "PT is not available for that slot" }, 409);
          return await updateMeeting(data.id, { assignedPtId: data.ptId, usedFallback: 0 });
        }
        return await sendLoginForGuestMeeting(meeting, session.userId);
      },
    },
  },
});

async function getPts() {
  return await db
    .select({
      id: schema.users.id,
      displayName: schema.users.displayName,
      email: schema.users.email,
    })
    .from(schema.users)
    .where(eq(schema.users.role, "pt"))
    .orderBy(asc(schema.users.displayName));
}

async function getActiveBookings() {
  const rows = await db
    .select({
      ptId: schema.bookings.ptId,
      scheduledAt: schema.bookings.scheduledAt,
      status: schema.bookings.status,
    })
    .from(schema.bookings)
  return rows.filter((row) => activeBookingStatuses.has(row.status));
}

async function getGuestMeetingSlots() {
  return await db
    .select({
      id: schema.guestMeetings.id,
      assignedPtId: schema.guestMeetings.assignedPtId,
      scheduledAt: schema.guestMeetings.scheduledAt,
      status: schema.guestMeetings.status,
    })
    .from(schema.guestMeetings);
}

async function getUnavailableDaysForDate(unavailableDate: string) {
  return await db
    .select({
      ptId: schema.ptUnavailableDays.ptId,
      unavailableDate: schema.ptUnavailableDays.unavailableDate,
    })
    .from(schema.ptUnavailableDays)
    .where(eq(schema.ptUnavailableDays.unavailableDate, unavailableDate));
}

async function updateMeeting(id: string, patch: Partial<typeof schema.guestMeetings.$inferInsert>) {
  await db
    .update(schema.guestMeetings)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(schema.guestMeetings.id, id));
  return json({ ok: true });
}

async function sendLoginForGuestMeeting(
  meeting: typeof schema.guestMeetings.$inferSelect,
  actorId: string,
) {
  const canSendLogin =
    meeting.status === "completed" ||
    meeting.status === "account_invited" ||
    (meeting.status === "email_failed" && Boolean(meeting.createdUserId));
  if (!canSendLogin) {
    return json({ error: "Complete the meeting before sending a login" }, 400);
  }
  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, meeting.guestEmail))
    .limit(1);
  if (
    !canProvisionGuestLogin({
      existingUserId: existing?.id ?? null,
      meetingCreatedUserId: meeting.createdUserId,
    })
  ) {
    return json({ error: "A user with this email already exists" }, 400);
  }

  const password = generateTemporaryPassword();
  const now = new Date().toISOString();
  const userId = existing?.id ?? meeting.createdUserId ?? newId();
  if (existing) {
    await db
      .update(schema.users)
      .set({
        passwordHash: hashPassword(password),
        assignedPtId: meeting.assignedPtId,
        mustChangePassword: 1,
      })
      .where(eq(schema.users.id, userId));
  } else {
    await db
      .insert(schema.users)
      .values({
        id: userId,
        email: meeting.guestEmail,
        passwordHash: hashPassword(password),
        displayName: meeting.guestName,
        role: "customer",
        assignedPtId: meeting.assignedPtId,
        mustChangePassword: 1,
      });
    await db
      .insert(schema.profiles)
      .values({
        userId,
        goal: meeting.goal,
        level: meeting.experience,
      });
  }

  const email = await sendTemporaryPasswordEmail({
    to: meeting.guestEmail,
    guestName: meeting.guestName,
    password,
  });
  await db
    .update(schema.guestMeetings)
    .set({
      status: email.sent ? "account_invited" : "email_failed",
      loginEmailSentAt: email.sent ? now : meeting.loginEmailSentAt,
      createdUserId: userId,
      updatedAt: now,
    })
    .where(eq(schema.guestMeetings.id, meeting.id));

  return json({
    ok: true,
    emailSent: email.sent,
    userId,
    actorId,
    status: email.sent ? "account_invited" : "email_failed",
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
