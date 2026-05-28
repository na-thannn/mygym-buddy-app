import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getSessionUser } from "@/server/auth";
import { db, schema } from "@/server/db";
import { desc, eq } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import { APP_ROLES } from "@/lib/roles";

const roleSchema = z.enum(APP_ROLES);
type Role = z.infer<typeof roleSchema>;

const updateSchema = z.object({
  id: z.string().min(1),
  role: roleSchema.optional(),
  assignedPtId: z.string().nullable().optional(),
});

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async () => {
        const session = getSessionUser();
        if (!session) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (session.role !== "admin") {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const users = db
            .select({
              id: schema.users.id,
              email: schema.users.email,
              displayName: schema.users.displayName,
              role: schema.users.role,
              assignedPtId: schema.users.assignedPtId,
              createdAt: schema.users.createdAt,
            })
            .from(schema.users)
            .orderBy(desc(schema.users.createdAt))
            .limit(500)
            .all();

          const pts = db
            .select({
              id: schema.users.id,
              email: schema.users.email,
              displayName: schema.users.displayName,
            })
            .from(schema.users)
            .where(eq(schema.users.role, "pt"))
            .orderBy(desc(schema.users.createdAt))
            .all();

          return new Response(JSON.stringify({ users, pts }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          await logDevError({ error: err, req: { method: "GET", url: "/api/admin/users" } }).catch(
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
        if (!session) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (session.role !== "admin") {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        const parsed = updateSchema.safeParse(bodyObj);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Invalid input", details: parsed.error }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const data = parsed.data;
        if (data.role && data.id === session.userId && data.role !== "admin") {
          return new Response(JSON.stringify({ error: "Cannot remove your own admin role" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const existing = db
          .select({ role: schema.users.role })
          .from(schema.users)
          .where(eq(schema.users.id, data.id))
          .get();
        if (!existing) {
          return new Response(JSON.stringify({ error: "User not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const patch: Record<string, unknown> = {};
        if (data.role) {
          patch.role = data.role;
          if (data.role !== "customer") {
            patch.assignedPtId = null;
          }
        }

        if (Object.prototype.hasOwnProperty.call(data, "assignedPtId")) {
          const targetRole = (patch.role as Role | undefined) ?? (existing.role as Role);
          if (targetRole !== "customer") {
            return new Response(JSON.stringify({ error: "Only customers can be assigned PTs" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
          const trimmed = data.assignedPtId ? data.assignedPtId.trim() : null;
          if (trimmed) {
            const pt = db
              .select({ id: schema.users.id, role: schema.users.role })
              .from(schema.users)
              .where(eq(schema.users.id, trimmed))
              .get();
            if (!pt || pt.role !== "pt") {
              return new Response(JSON.stringify({ error: "Assigned PT not found" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
              });
            }
          }
          patch.assignedPtId = trimmed || null;
        }

        if (Object.keys(patch).length === 0) {
          return new Response(JSON.stringify({ error: "Nothing to update" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          db.update(schema.users).set(patch).where(eq(schema.users.id, data.id)).run();
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/admin/users", body: data },
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
