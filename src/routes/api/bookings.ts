import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import { canManageBooking, hasAnyRole } from "@/lib/roles";

export const Route = createFileRoute("/api/bookings")({
  server: {
    handlers: {
      GET: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const session = getSessionUser();
        if (!session)
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });

        const url = new URL(request.url);
        const forUserId = url.searchParams.get("forUserId");
        const forPtId = url.searchParams.get("forPtId");
        const status = url.searchParams.get("status");
        const limit = Number(url.searchParams.get("limit") || "200");

        const where: SQL[] = [];
        if (session.role === "customer") where.push(eq(schema.bookings.customerId, session.userId));
        else if (session.role === "pt") where.push(eq(schema.bookings.ptId, session.userId));
        if (hasAnyRole(session, ["admin", "staff"])) {
          if (forUserId) where.push(eq(schema.bookings.customerId, forUserId));
          if (forPtId) where.push(eq(schema.bookings.ptId, forPtId));
        }
        if (status) where.push(eq(schema.bookings.status, status));

        try {
          const rows = where.length
            ? db
                .select()
                .from(schema.bookings)
                .where(and(...where))
                .orderBy(desc(schema.bookings.scheduledAt))
                .limit(limit)
                .all()
            : db
                .select()
                .from(schema.bookings)
                .orderBy(desc(schema.bookings.scheduledAt))
                .limit(limit)
                .all();
          return new Response(JSON.stringify(rows), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          await logDevError({ error: err, req: { method: "GET", url: "/api/bookings" } }).catch(
            () => {},
          );
          return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      POST: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const session = getSessionUser();
        if (!session)
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        const body = (await parseRequestBody(request as unknown)) as Record<string, unknown>;
        const scheduledAt = typeof body?.scheduledAt === "string" ? body.scheduledAt : null;
        const durationMinutes =
          typeof body?.durationMinutes === "number"
            ? body.durationMinutes
            : body?.durationMinutes
              ? Number(String(body.durationMinutes))
              : 60;
        const notes = typeof body?.notes === "string" ? body.notes : null;
        const requestedCustomerId = typeof body?.customerId === "string" ? body.customerId : null;
        const requestedPtId =
          typeof body?.ptId === "string" && body.ptId.trim() ? body.ptId.trim() : null;
        if (!scheduledAt)
          return new Response(JSON.stringify({ error: "scheduledAt required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        try {
          let customerId = session.userId;
          if (session.role === "customer") {
            customerId = session.userId;
          } else if (hasAnyRole(session, ["admin", "staff"]) && requestedCustomerId) {
            customerId = requestedCustomerId;
          } else if (session.role === "pt" && requestedCustomerId) {
            const assigned = db
              .select({ id: schema.users.id })
              .from(schema.users)
              .where(
                and(
                  eq(schema.users.id, requestedCustomerId),
                  eq(schema.users.assignedPtId, session.userId),
                ),
              )
              .get();
            if (!assigned) {
              return new Response(
                JSON.stringify({ error: "PT can only book assigned customers" }),
                {
                  status: 403,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }
            customerId = requestedCustomerId;
          } else {
            return new Response(JSON.stringify({ error: "customerId required" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const customer = db
            .select({
              id: schema.users.id,
              role: schema.users.role,
              assignedPtId: schema.users.assignedPtId,
            })
            .from(schema.users)
            .where(eq(schema.users.id, customerId))
            .get();
          if (!customer || customer.role !== "customer") {
            return new Response(JSON.stringify({ error: "Customer not found" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const ptId = requestedPtId ?? customer.assignedPtId ?? null;
          if (ptId) {
            const pt = db
              .select({ id: schema.users.id, role: schema.users.role })
              .from(schema.users)
              .where(eq(schema.users.id, ptId))
              .get();
            if (!pt || pt.role !== "pt") {
              return new Response(JSON.stringify({ error: "PT not found" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }
          }

          const id = newId();
          db.insert(schema.bookings)
            .values({
              id,
              customerId,
              ptId,
              scheduledAt,
              durationMinutes,
              notes,
            })
            .run();
          return new Response(JSON.stringify({ ok: true, id }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/bookings", body },
          }).catch(() => {});
          return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
      PATCH: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const session = getSessionUser();
        if (!session)
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        const body = (await parseRequestBody(request as unknown)) as Record<string, unknown>;
        const id = typeof body?.id === "string" ? body.id : null;
        const action = typeof body?.action === "string" ? body.action : null;
        if (!id || !action)
          return new Response(JSON.stringify({ error: "id and action required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        const allowedActions = ["accept", "decline", "cancel", "reschedule", "complete"] as const;
        type AllowedAction = (typeof allowedActions)[number];
        if (!allowedActions.includes(action as AllowedAction)) {
          return new Response(JSON.stringify({ error: "Unknown action" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        try {
          const row = db.select().from(schema.bookings).where(eq(schema.bookings.id, id)).get();
          if (!row)
            return new Response(JSON.stringify({ error: "Not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });

          const bookingAction = action as AllowedAction;
          if (!canManageBooking(session, row, bookingAction)) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }

          const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
          if (action === "accept") {
            updates.status = "confirmed";
            if (session.role === "pt") updates.ptId = session.userId;
            if (typeof body?.ptId === "string" && hasAnyRole(session, ["admin", "staff"])) {
              updates.ptId = body.ptId.trim() || null;
            }
          } else if (action === "decline") {
            updates.status = "declined";
            updates.cancelledBy = session.userId;
            updates.cancellationReason =
              typeof body?.cancellationReason === "string" ? body.cancellationReason : null;
          } else if (action === "cancel") {
            updates.status = "cancelled";
            updates.cancelledBy = session.userId;
            updates.cancellationReason =
              typeof body?.cancellationReason === "string" ? body.cancellationReason : null;
          } else if (action === "reschedule") {
            const scheduledAt = typeof body?.scheduledAt === "string" ? body.scheduledAt : null;
            if (!scheduledAt)
              return new Response(JSON.stringify({ error: "scheduledAt required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            updates.scheduledAt = scheduledAt;
            if (typeof body?.durationMinutes === "number")
              updates.durationMinutes = body.durationMinutes;
            updates.status = "rescheduled";
          } else if (action === "complete") {
            updates.status = "completed";
          } else {
            return new Response(JSON.stringify({ error: "Unknown action" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          db.update(schema.bookings).set(updates).where(eq(schema.bookings.id, id)).run();
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "PATCH", url: "/api/bookings", body },
          }).catch(() => {});
          return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
