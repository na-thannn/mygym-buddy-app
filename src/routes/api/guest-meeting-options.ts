import { createFileRoute } from "@tanstack/react-router";
import { asc, eq } from "drizzle-orm";
import { generateFixedMeetingSlots, selectPtForGuestMeeting } from "@/lib/guest-meetings";
import { db, schema } from "@/server/db";

export const Route = createFileRoute("/api/guest-meeting-options")({
  server: {
    handlers: {
      GET: async () => {
        const pts = await db
          .select({
            id: schema.users.id,
            displayName: schema.users.displayName,
            email: schema.users.email,
          })
          .from(schema.users)
          .where(eq(schema.users.role, "pt"))
          .orderBy(asc(schema.users.displayName));
        const rawSlots = generateFixedMeetingSlots();
        const bookingRows = await db
          .select({
            ptId: schema.bookings.ptId,
            scheduledAt: schema.bookings.scheduledAt,
            status: schema.bookings.status,
          })
          .from(schema.bookings);
        const bookings = bookingRows.filter((row) => !["cancelled", "declined"].includes(row.status));
        const meetings = await db
          .select({
            assignedPtId: schema.guestMeetings.assignedPtId,
            scheduledAt: schema.guestMeetings.scheduledAt,
            status: schema.guestMeetings.status,
          })
          .from(schema.guestMeetings);
        const unavailabilityBlocks = await db
          .select({
            id: schema.ptUnavailabilityBlocks.id,
            ptId: schema.ptUnavailabilityBlocks.ptId,
            unavailableDate: schema.ptUnavailabilityBlocks.unavailableDate,
            allDay: schema.ptUnavailabilityBlocks.allDay,
            startTime: schema.ptUnavailabilityBlocks.startTime,
            endTime: schema.ptUnavailabilityBlocks.endTime,
            reason: schema.ptUnavailabilityBlocks.reason,
          })
          .from(schema.ptUnavailabilityBlocks);

        const availability = pts.map((pt) => ({
          ptId: pt.id,
          unavailableSlots: rawSlots.filter(
            (scheduledAt) =>
              !selectPtForGuestMeeting({
                requestedPtId: pt.id,
                scheduledAt,
                pts: [{ id: pt.id, displayName: pt.displayName }],
                existingBookings: bookings,
                existingGuestMeetings: meetings,
                unavailabilityBlocks,
              }),
          ),
        }));

        return json({
          pts,
          slots: rawSlots.map((scheduledAt) => ({
            scheduledAt,
            label: formatSaigonSlot(scheduledAt),
          })),
          availability,
        });
      },
    },
  },
});

function formatSaigonSlot(isoDateTime: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Saigon",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDateTime));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
