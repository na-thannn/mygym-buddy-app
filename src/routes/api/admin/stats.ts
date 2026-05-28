import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser } from "@/server/auth";
import { db, schema } from "@/server/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import logDevError from "@/lib/error-logger";

type RoleCounts = {
  admin: number;
  staff: number;
  pt: number;
  customer: number;
};

type PtLoad = {
  id: string;
  displayName: string;
  email: string;
  assignedCount: number;
};

export const Route = createFileRoute("/api/admin/stats")({
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
          const roleRows = db
            .select({ role: schema.users.role, count: sql<number>`count(*)` })
            .from(schema.users)
            .groupBy(schema.users.role)
            .all();

          const baseCounts: RoleCounts = {
            admin: 0,
            staff: 0,
            pt: 0,
            customer: 0,
          };

          const counts = roleRows.reduce((acc, row) => {
            const role = row.role as keyof RoleCounts;
            if (role in acc) acc[role] = row.count ?? 0;
            return acc;
          }, baseCounts);

          const totalUsers = roleRows.reduce((sum, row) => sum + (row.count ?? 0), 0);

          const bookingRows = db
            .select({ status: schema.bookings.status, count: sql<number>`count(*)` })
            .from(schema.bookings)
            .groupBy(schema.bookings.status)
            .all();

          const bookingStatusCounts = bookingRows.reduce<Record<string, number>>((acc, row) => {
            acc[row.status] = Number(row.count ?? 0);
            return acc;
          }, {});

          const supportRows = db
            .select({ status: schema.supportTickets.status, count: sql<number>`count(*)` })
            .from(schema.supportTickets)
            .groupBy(schema.supportTickets.status)
            .all();

          const supportStatusCounts = supportRows.reduce<Record<string, number>>((acc, row) => {
            acc[row.status] = Number(row.count ?? 0);
            return acc;
          }, {});

          const classStats = db
            .select({
              sessions: sql<number>`count(distinct ${schema.groupClassSessions.id})`,
              enrollments: sql<number>`count(${schema.groupClassBookings.id})`,
              attended: sql<number>`sum(case when ${schema.groupClassBookings.status} = 'attended' then 1 else 0 end)`,
            })
            .from(schema.groupClassSessions)
            .leftJoin(
              schema.groupClassBookings,
              eq(schema.groupClassSessions.id, schema.groupClassBookings.sessionId),
            )
            .get();

          const unassignedRow = db
            .select({ count: sql<number>`count(*)` })
            .from(schema.users)
            .where(and(eq(schema.users.role, "customer"), isNull(schema.users.assignedPtId)))
            .get();

          const pts = db
            .select({
              id: schema.users.id,
              displayName: schema.users.displayName,
              email: schema.users.email,
            })
            .from(schema.users)
            .where(eq(schema.users.role, "pt"))
            .all();

          const ptLoads = db
            .select({
              assignedPtId: schema.users.assignedPtId,
              count: sql<number>`count(*)`,
            })
            .from(schema.users)
            .where(eq(schema.users.role, "customer"))
            .groupBy(schema.users.assignedPtId)
            .all();

          const ptLoadMap = new Map<string, number>();
          for (const row of ptLoads) {
            if (row.assignedPtId) ptLoadMap.set(row.assignedPtId, row.count ?? 0);
          }

          const ptLoadList: PtLoad[] = pts.map((pt) => ({
            id: pt.id,
            displayName: pt.displayName,
            email: pt.email,
            assignedCount: ptLoadMap.get(pt.id) ?? 0,
          }));

          return new Response(
            JSON.stringify({
              totalUsers,
              byRole: counts,
              unassignedCustomers: unassignedRow?.count ?? 0,
              ptLoads: ptLoadList,
              bookingsByStatus: bookingStatusCounts,
              supportByStatus: supportStatusCounts,
              openSupportTickets:
                (supportStatusCounts.open ?? 0) + (supportStatusCounts.assigned ?? 0),
              groupClasses: {
                sessions: Number(classStats?.sessions ?? 0),
                enrollments: Number(classStats?.enrollments ?? 0),
                attended: Number(classStats?.attended ?? 0),
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (err) {
          await logDevError({ error: err, req: { method: "GET", url: "/api/admin/stats" } }).catch(
            () => {},
          );
          return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
