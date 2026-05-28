import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { getSessionUser, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { parseRequestBody } from "@/lib/request-utils";
import { canManageSupportTicket, hasAnyRole } from "@/lib/roles";
import logDevError from "@/lib/error-logger";

const createSchema = z.object({
  customerId: z.string().optional(),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(5).max(2000),
  source: z.enum(["customer", "ai_chat"]).optional().default("customer"),
});

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["open", "assigned", "resolved", "closed"]).optional(),
  assignedStaffId: z.string().nullable().optional(),
  assignedPtId: z.string().nullable().optional(),
  resolutionNotes: z.string().max(1000).nullable().optional(),
});

export const Route = createFileRoute("/api/support")({
  server: {
    handlers: {
      GET: async () => {
        const session = getSessionUser();
        if (!session) {
          return json({ error: "Unauthorized" }, 401);
        }

        const where: SQL[] = [];
        if (session.role === "customer") {
          where.push(eq(schema.supportTickets.customerId, session.userId));
        } else if (session.role === "pt") {
          where.push(eq(schema.supportTickets.assignedPtId, session.userId));
        }

        try {
          const selectTickets = () =>
            db
              .select({
                id: schema.supportTickets.id,
                customerId: schema.supportTickets.customerId,
                customerName: schema.users.displayName,
                customerEmail: schema.users.email,
                subject: schema.supportTickets.subject,
                message: schema.supportTickets.message,
                source: schema.supportTickets.source,
                status: schema.supportTickets.status,
                assignedStaffId: schema.supportTickets.assignedStaffId,
                assignedPtId: schema.supportTickets.assignedPtId,
                resolutionNotes: schema.supportTickets.resolutionNotes,
                resolvedAt: schema.supportTickets.resolvedAt,
                createdAt: schema.supportTickets.createdAt,
                updatedAt: schema.supportTickets.updatedAt,
              })
              .from(schema.supportTickets)
              .innerJoin(schema.users, eq(schema.supportTickets.customerId, schema.users.id));

          const tickets = where.length
            ? selectTickets()
                .where(and(...where))
                .orderBy(desc(schema.supportTickets.updatedAt))
                .limit(200)
                .all()
            : selectTickets().orderBy(desc(schema.supportTickets.updatedAt)).limit(200).all();
          return json({ tickets });
        } catch (err) {
          await logDevError({ error: err, req: { method: "GET", url: "/api/support" } }).catch(
            () => {},
          );
          return json({ error: "Server error" }, 500);
        }
      },

      POST: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const session = getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);

        const parsed = createSchema.safeParse(await parseRequestBody(request as unknown));
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);

        let customerId = session.userId;
        if (session.role === "customer") {
          customerId = session.userId;
        } else if (hasAnyRole(session, ["admin", "staff"]) && parsed.data.customerId) {
          customerId = parsed.data.customerId;
        } else if (session.role === "pt" && parsed.data.customerId) {
          const assignedCustomer = db
            .select({ id: schema.users.id })
            .from(schema.users)
            .where(
              and(
                eq(schema.users.id, parsed.data.customerId),
                eq(schema.users.assignedPtId, session.userId),
              ),
            )
            .get();
          if (!assignedCustomer)
            return json({ error: "PT can only create for assigned clients" }, 403);
          customerId = parsed.data.customerId;
        } else {
          return json({ error: "customerId required" }, 400);
        }

        const customer = db
          .select({ id: schema.users.id, role: schema.users.role })
          .from(schema.users)
          .where(eq(schema.users.id, customerId))
          .get();
        if (!customer || customer.role !== "customer")
          return json({ error: "Customer not found" }, 400);

        try {
          const id = newId();
          db.insert(schema.supportTickets)
            .values({
              id,
              customerId,
              subject: parsed.data.subject,
              message: parsed.data.message,
              source: parsed.data.source,
            })
            .run();
          return json({ ok: true, id }, 201);
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/support", body: parsed.data },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },

      PATCH: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const session = getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);

        const parsed = updateSchema.safeParse(await parseRequestBody(request as unknown));
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
        const data = parsed.data;

        const ticket = db
          .select()
          .from(schema.supportTickets)
          .where(eq(schema.supportTickets.id, data.id))
          .get();
        if (!ticket) return json({ error: "Ticket not found" }, 404);

        const action =
          data.status === "resolved" || data.status === "closed" ? "resolve" : "triage";
        if (!canManageSupportTicket(session, ticket, action))
          return json({ error: "Forbidden" }, 403);

        const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
        if (Object.prototype.hasOwnProperty.call(data, "assignedStaffId")) {
          if (data.assignedStaffId) {
            const staff = db
              .select({ id: schema.users.id, role: schema.users.role })
              .from(schema.users)
              .where(eq(schema.users.id, data.assignedStaffId))
              .get();
            if (!staff || !["staff", "admin"].includes(staff.role)) {
              return json({ error: "Assigned staff not found" }, 400);
            }
          }
          patch.assignedStaffId = data.assignedStaffId ?? null;
        }
        if (Object.prototype.hasOwnProperty.call(data, "assignedPtId")) {
          if (data.assignedPtId) {
            const pt = db
              .select({ id: schema.users.id, role: schema.users.role })
              .from(schema.users)
              .where(eq(schema.users.id, data.assignedPtId))
              .get();
            if (!pt || pt.role !== "pt") return json({ error: "Assigned PT not found" }, 400);
          }
          patch.assignedPtId = data.assignedPtId ?? null;
        }
        if (data.status) {
          patch.status = data.status;
          if (data.status === "resolved" || data.status === "closed") {
            patch.resolvedAt = new Date().toISOString();
          }
        }
        if (Object.prototype.hasOwnProperty.call(data, "resolutionNotes")) {
          patch.resolutionNotes = data.resolutionNotes ?? null;
        }

        try {
          db.update(schema.supportTickets)
            .set(patch)
            .where(eq(schema.supportTickets.id, data.id))
            .run();
          return json({ ok: true });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "PATCH", url: "/api/support", body: data },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
