import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { getSessionUser, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { parseRequestBody } from "@/lib/request-utils";
import {
  canBookGroupClassSession,
  canManageGroupClasses,
  getGroupClassAvailability,
} from "@/lib/group-classes";
import { hasAnyRole } from "@/lib/roles";
import logDevError from "@/lib/error-logger";
import { isIntervalBlockedByPtUnavailability } from "@/lib/pt-availability";

const inputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create-class"),
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().max(1000).optional(),
    level: z.string().trim().max(40).optional(),
  }),
  z.object({
    action: z.literal("schedule-session"),
    classId: z.string().min(1),
    trainerId: z.string().nullable().optional(),
    startsAt: z.string().min(1),
    durationMinutes: z.number().int().min(15).max(240).optional().default(60),
    capacity: z.number().int().min(1).max(100).optional().default(12),
  }),
  z.object({
    action: z.literal("book-session"),
    sessionId: z.string().min(1),
  }),
  z.object({
    action: z.literal("cancel-booking"),
    bookingId: z.string().min(1),
  }),
  z.object({
    action: z.literal("mark-attendance"),
    bookingId: z.string().min(1),
    attended: z.boolean(),
  }),
]);

export const Route = createFileRoute("/api/classes")({
  server: {
    handlers: {
      GET: async () => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);

        try {
          const sessions = await db
            .select({
              sessionId: schema.groupClassSessions.id,
              classId: schema.groupClassSessions.classId,
              title: schema.groupClasses.title,
              description: schema.groupClasses.description,
              level: schema.groupClasses.level,
              trainerId: schema.groupClassSessions.trainerId,
              startsAt: schema.groupClassSessions.startsAt,
              durationMinutes: schema.groupClassSessions.durationMinutes,
              capacity: schema.groupClassSessions.capacity,
              status: schema.groupClassSessions.status,
            })
            .from(schema.groupClassSessions)
            .innerJoin(
              schema.groupClasses,
              eq(schema.groupClassSessions.classId, schema.groupClasses.id),
            )
            .orderBy(desc(schema.groupClassSessions.startsAt))
            .limit(200);

          const countRows = await db
            .select({
              sessionId: schema.groupClassBookings.sessionId,
              count: sql<number>`count(*)`,
            })
            .from(schema.groupClassBookings)
            .where(eq(schema.groupClassBookings.status, "booked"))
            .groupBy(schema.groupClassBookings.sessionId);
          const counts = new Map(countRows.map((row) => [row.sessionId, Number(row.count ?? 0)]));

          const myBookings =
            session.role === "customer"
              ? await db
                  .select({
                    id: schema.groupClassBookings.id,
                    sessionId: schema.groupClassBookings.sessionId,
                    status: schema.groupClassBookings.status,
                  })
                  .from(schema.groupClassBookings)
                  .where(eq(schema.groupClassBookings.customerId, session.userId))
              : [];
          const mine = new Map(myBookings.map((row) => [row.sessionId, row]));

          const rows = sessions.map((row) => {
            const bookedCount = counts.get(row.sessionId) ?? 0;
            return {
              ...row,
              ...getGroupClassAvailability(row.capacity, bookedCount),
              myBooking: mine.get(row.sessionId) ?? null,
            };
          });

          const enrollments = canManageGroupClasses(session)
            ? await db
                .select({
                  id: schema.groupClassBookings.id,
                  sessionId: schema.groupClassBookings.sessionId,
                  customerId: schema.groupClassBookings.customerId,
                  customerName: schema.users.displayName,
                  customerEmail: schema.users.email,
                  status: schema.groupClassBookings.status,
                  attendedAt: schema.groupClassBookings.attendedAt,
                })
                .from(schema.groupClassBookings)
                .innerJoin(schema.users, eq(schema.groupClassBookings.customerId, schema.users.id))
                .orderBy(desc(schema.groupClassBookings.createdAt))
                .limit(500)
            : [];

          const classes = hasAnyRole(session, ["admin", "manager"])
            ? await db
                .select()
                .from(schema.groupClasses)
                .orderBy(desc(schema.groupClasses.createdAt))
            : [];

          return json({ sessions: rows, enrollments, classes });
        } catch (err) {
          await logDevError({ error: err, req: { method: "GET", url: "/api/classes" } }).catch(
            () => {},
          );
          return json({ error: "Server error" }, 500);
        }
      },

      POST: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);

        const parsed = inputSchema.safeParse(await parseRequestBody(request as unknown));
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
        const data = parsed.data;

        try {
          if (data.action === "create-class") {
            if (!canManageGroupClasses(session)) return json({ error: "Forbidden" }, 403);
            const id = newId();
            await db
              .insert(schema.groupClasses)
              .values({
                id,
                title: data.title,
                description: data.description ?? null,
                level: data.level ?? null,
                createdBy: session.userId,
              });
            return json({ ok: true, id }, 201);
          }

          if (data.action === "schedule-session") {
            if (!canManageGroupClasses(session)) return json({ error: "Forbidden" }, 403);
            const [cls] = await db
              .select({ id: schema.groupClasses.id })
              .from(schema.groupClasses)
              .where(eq(schema.groupClasses.id, data.classId))
              .limit(1);
            if (!cls) return json({ error: "Class not found" }, 404);
            if (data.trainerId) {
              const [trainer] = await db
                .select({ id: schema.users.id, role: schema.users.role })
                .from(schema.users)
                .where(eq(schema.users.id, data.trainerId))
                .limit(1);
              if (!trainer || !["pt", "manager", "admin"].includes(trainer.role)) {
                return json({ error: "Trainer not found" }, 400);
              }
              if (
                trainer.role === "pt" &&
                (await isPtUnavailableForClassSession(
                  data.trainerId,
                  data.startsAt,
                  data.durationMinutes,
                ))
              ) {
                return json({ error: "Trainer is unavailable for that time" }, 409);
              }
            }
            const id = newId();
            await db
              .insert(schema.groupClassSessions)
              .values({
                id,
                classId: data.classId,
                trainerId: data.trainerId ?? null,
                startsAt: data.startsAt,
                durationMinutes: data.durationMinutes,
                capacity: data.capacity,
              });
            return json({ ok: true, id }, 201);
          }

          if (data.action === "book-session") {
            if (session.role !== "customer")
              return json({ error: "Only customers can book classes" }, 403);
            const [classSession] = await db
              .select()
              .from(schema.groupClassSessions)
              .where(eq(schema.groupClassSessions.id, data.sessionId))
              .limit(1);
            if (!classSession) return json({ error: "Session not found" }, 404);

            const [bookedRow] = await db
              .select({ count: sql<number>`count(*)` })
              .from(schema.groupClassBookings)
              .where(
                and(
                  eq(schema.groupClassBookings.sessionId, data.sessionId),
                  eq(schema.groupClassBookings.status, "booked"),
                ),
              )
              .limit(1);
            const [existing] = await db
              .select()
              .from(schema.groupClassBookings)
              .where(
                and(
                  eq(schema.groupClassBookings.sessionId, data.sessionId),
                  eq(schema.groupClassBookings.customerId, session.userId),
                ),
              )
              .limit(1);

            if (
              !canBookGroupClassSession({
                capacity: classSession.capacity,
                bookedCount: Number(bookedRow?.count ?? 0),
                alreadyBooked: existing?.status === "booked",
                status: classSession.status,
              })
            ) {
              return json({ error: "Class is full, unavailable, or already booked" }, 400);
            }

            if (existing) {
              await db
                .update(schema.groupClassBookings)
                .set({ status: "booked", attendedAt: null, updatedAt: new Date().toISOString() })
                .where(eq(schema.groupClassBookings.id, existing.id));
              return json({ ok: true, id: existing.id });
            }

            const id = newId();
            await db
              .insert(schema.groupClassBookings)
              .values({ id, sessionId: data.sessionId, customerId: session.userId });
            return json({ ok: true, id }, 201);
          }

          if (data.action === "cancel-booking") {
            const [booking] = await db
              .select()
              .from(schema.groupClassBookings)
              .where(eq(schema.groupClassBookings.id, data.bookingId))
              .limit(1);
            if (!booking) return json({ error: "Booking not found" }, 404);
            const canCancel =
              hasAnyRole(session, ["admin", "manager"]) ||
              (session.role === "customer" && booking.customerId === session.userId);
            if (!canCancel) return json({ error: "Forbidden" }, 403);
            await db
              .update(schema.groupClassBookings)
              .set({ status: "cancelled", attendedAt: null, updatedAt: new Date().toISOString() })
              .where(eq(schema.groupClassBookings.id, data.bookingId));
            return json({ ok: true });
          }

          if (data.action === "mark-attendance") {
            if (!canManageGroupClasses(session)) return json({ error: "Forbidden" }, 403);
            const status = data.attended ? "attended" : "no_show";
            await db
              .update(schema.groupClassBookings)
              .set({
                status,
                attendedAt: data.attended ? new Date().toISOString() : null,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(schema.groupClassBookings.id, data.bookingId));
            return json({ ok: true });
          }

          return json({ error: "Unknown action" }, 400);
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/classes", body: data },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});

async function isPtUnavailableForClassSession(
  ptId: string,
  startsAt: string,
  durationMinutes: number,
): Promise<boolean> {
  const blocks = await db
    .select()
    .from(schema.ptUnavailabilityBlocks)
    .where(eq(schema.ptUnavailabilityBlocks.ptId, ptId));
  return isIntervalBlockedByPtUnavailability({ ptId, startsAt, durationMinutes, blocks });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
