import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { hasAnyRole } from "@/lib/roles";
import {
  isIntervalBlockedByPtUnavailability,
  validatePtUnavailabilityBlock,
  type PtUnavailabilityBlock,
} from "@/lib/pt-availability";
import { parseRequestBody } from "@/lib/request-utils";
import { db, schema } from "@/server/db";
import { getSessionUser, newId } from "@/server/auth";

const createSchema = z.object({
  ptId: z.string().min(1).optional(),
  unavailableDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  allDay: z.boolean().default(true),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  reason: z.string().max(160).optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

const activeBookingStatuses = new Set(["pending", "rescheduled", "confirmed"]);
const activeGuestStatuses = new Set(["confirmed", "completed", "account_invited", "email_failed"]);

export type PtUnavailabilityConflict = {
  type: "booking" | "guest_meeting" | "class_session";
  id: string;
  title: string;
  startsAt: string;
};

export const Route = createFileRoute("/api/pt-unavailability-blocks")({
  server: {
    handlers: {
      GET: async () => handlePtUnavailabilityBlocksRequest(new Request("http://local.test/api/pt-unavailability-blocks")),
      POST: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        return handlePtUnavailabilityBlocksRequest(request as unknown as Request);
      },
      DELETE: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        return handlePtUnavailabilityBlocksRequest(request as unknown as Request);
      },
    },
  },
});

export async function handlePtUnavailabilityBlocksRequest(request: Request): Promise<Response> {
  const session = await getSessionUser();
  if (!session) return json({ error: "Unauthorized" }, 401);
  if (session.role !== "pt" && !hasAnyRole(session, ["admin", "manager"])) {
    return json({ error: "Forbidden" }, 403);
  }

  if (request.method === "GET") {
    const days =
      session.role === "pt"
        ? await db
            .select()
            .from(schema.ptUnavailabilityBlocks)
            .where(eq(schema.ptUnavailabilityBlocks.ptId, session.userId))
            .orderBy(desc(schema.ptUnavailabilityBlocks.unavailableDate))
        : await db
            .select()
            .from(schema.ptUnavailabilityBlocks)
            .orderBy(desc(schema.ptUnavailabilityBlocks.unavailableDate))
            .limit(500);
    return json({ blocks: days });
  }

  if (request.method === "POST") {
    const parsed = createSchema.safeParse(await parseRequestBody(request as unknown));
    if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);

    const targetPtId = hasAnyRole(session, ["admin", "manager"])
      ? parsed.data.ptId
      : session.userId;
    if (!targetPtId) return json({ error: "ptId required" }, 400);

    const [pt] = await db
      .select({ id: schema.users.id, role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, targetPtId))
      .limit(1);
    if (!pt || pt.role !== "pt") return json({ error: "PT not found" }, 400);

    const validation = validatePtUnavailabilityBlock({
      allDay: parsed.data.allDay,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
    });
    if (!validation.ok) return json({ error: validation.error }, 400);

    const block: PtUnavailabilityBlock = {
      id: newId(),
      ptId: targetPtId,
      unavailableDate: parsed.data.unavailableDate,
      allDay: parsed.data.allDay,
      startTime: parsed.data.allDay ? null : parsed.data.startTime ?? null,
      endTime: parsed.data.allDay ? null : parsed.data.endTime ?? null,
      reason: parsed.data.reason?.trim() || null,
    };

    await db.insert(schema.ptUnavailabilityBlocks).values({
      id: block.id!,
      ptId: block.ptId,
      unavailableDate: block.unavailableDate,
      allDay: block.allDay ? 1 : 0,
      startTime: block.startTime,
      endTime: block.endTime,
      reason: block.reason,
    });

    return json({
      ok: true,
      id: block.id,
      conflicts: await findPtUnavailabilityConflicts(block),
    });
  }

  if (request.method === "DELETE") {
    const parsed = deleteSchema.safeParse(await parseRequestBody(request as unknown));
    if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
    const [row] = await db
      .select()
      .from(schema.ptUnavailabilityBlocks)
      .where(eq(schema.ptUnavailabilityBlocks.id, parsed.data.id))
      .limit(1);
    if (!row) return json({ error: "Unavailable block not found" }, 404);
    if (!hasAnyRole(session, ["admin", "manager"]) && row.ptId !== session.userId) {
      return json({ error: "Forbidden" }, 403);
    }
    await db
      .delete(schema.ptUnavailabilityBlocks)
      .where(eq(schema.ptUnavailabilityBlocks.id, parsed.data.id));
    return json({ ok: true });
  }

  return json({ error: "Method not allowed" }, 405);
}

export async function findPtUnavailabilityConflicts(
  block: PtUnavailabilityBlock,
): Promise<PtUnavailabilityConflict[]> {
  const [bookings, guestMeetings, classSessions] = await Promise.all([
    db
      .select({
        id: schema.bookings.id,
        startsAt: schema.bookings.scheduledAt,
        durationMinutes: schema.bookings.durationMinutes,
        status: schema.bookings.status,
      })
      .from(schema.bookings)
      .where(eq(schema.bookings.ptId, block.ptId)),
    db
      .select({
        id: schema.guestMeetings.id,
        startsAt: schema.guestMeetings.scheduledAt,
        durationMinutes: schema.guestMeetings.durationMinutes,
        status: schema.guestMeetings.status,
      })
      .from(schema.guestMeetings)
      .where(eq(schema.guestMeetings.assignedPtId, block.ptId)),
    db
      .select({
        id: schema.groupClassSessions.id,
        title: schema.groupClasses.title,
        startsAt: schema.groupClassSessions.startsAt,
        durationMinutes: schema.groupClassSessions.durationMinutes,
        status: schema.groupClassSessions.status,
      })
      .from(schema.groupClassSessions)
      .innerJoin(schema.groupClasses, eq(schema.groupClassSessions.classId, schema.groupClasses.id))
      .where(eq(schema.groupClassSessions.trainerId, block.ptId)),
  ]);

  const conflicts: PtUnavailabilityConflict[] = [];
  for (const booking of bookings) {
    if (
      activeBookingStatuses.has(booking.status) &&
      overlaps(block, booking.startsAt, booking.durationMinutes)
    ) {
      conflicts.push({
        type: "booking",
        id: booking.id,
        title: "PT booking",
        startsAt: booking.startsAt,
      });
    }
  }
  for (const meeting of guestMeetings) {
    if (
      activeGuestStatuses.has(meeting.status) &&
      overlaps(block, meeting.startsAt, meeting.durationMinutes)
    ) {
      conflicts.push({
        type: "guest_meeting",
        id: meeting.id,
        title: "Guest intro meeting",
        startsAt: meeting.startsAt,
      });
    }
  }
  for (const session of classSessions) {
    if (session.status === "scheduled" && overlaps(block, session.startsAt, session.durationMinutes)) {
      conflicts.push({
        type: "class_session",
        id: session.id,
        title: session.title,
        startsAt: session.startsAt,
      });
    }
  }
  return conflicts;
}

function overlaps(block: PtUnavailabilityBlock, startsAt: string, durationMinutes: number) {
  return isIntervalBlockedByPtUnavailability({
    ptId: block.ptId,
    startsAt,
    durationMinutes,
    blocks: [block],
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
