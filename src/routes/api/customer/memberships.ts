import { createFileRoute } from "@tanstack/react-router";
import { desc, eq } from "drizzle-orm";
import { getMembershipRuntimeStatus, type MembershipStatus } from "@/lib/crm";
import { getSessionUser } from "@/server/auth";
import { db, schema } from "@/server/db";
import { json } from "@/server/crm";

export const Route = createFileRoute("/api/customer/memberships")({
  server: {
    handlers: {
      GET: async () => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        if (session.role !== "customer") return json({ error: "Forbidden" }, 403);
        const rows = await db
          .select()
          .from(schema.memberships)
          .where(eq(schema.memberships.customerId, session.userId))
          .orderBy(desc(schema.memberships.endsOn))
          .limit(50);
        const today = new Date().toISOString().slice(0, 10);
        return json({
          memberships: rows.map((row) => ({
            ...row,
            runtimeStatus: getMembershipRuntimeStatus({
              status: row.status as MembershipStatus,
              endsOn: row.endsOn,
              today,
            }),
          })),
        });
      },
    },
  },
});
