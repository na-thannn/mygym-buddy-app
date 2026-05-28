import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq } from "drizzle-orm";
import { getSessionUser } from "@/server/auth";
import { db, schema } from "@/server/db";
import { canViewCustomerFitnessData, hasAnyRole } from "@/lib/roles";
import logDevError from "@/lib/error-logger";

export const Route = createFileRoute("/api/customers")({
  server: {
    handlers: {
      GET: async () => {
        const session = getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);

        try {
          const where = [eq(schema.users.role, "customer")];
          if (session.role === "pt") {
            where.push(eq(schema.users.assignedPtId, session.userId));
          } else if (session.role === "customer") {
            where.push(eq(schema.users.id, session.userId));
          } else if (!hasAnyRole(session, ["admin", "staff"])) {
            return json({ error: "Forbidden" }, 403);
          }

          const customers = db
            .select({
              id: schema.users.id,
              email: schema.users.email,
              displayName: schema.users.displayName,
              assignedPtId: schema.users.assignedPtId,
              createdAt: schema.users.createdAt,
            })
            .from(schema.users)
            .where(and(...where))
            .orderBy(desc(schema.users.createdAt))
            .limit(500)
            .all();
          return json({
            customers: customers.map((customer) => ({
              ...customer,
              canViewFitness: canViewCustomerFitnessData(session, customer),
            })),
          });
        } catch (err) {
          await logDevError({ error: err, req: { method: "GET", url: "/api/customers" } }).catch(
            () => {},
          );
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
