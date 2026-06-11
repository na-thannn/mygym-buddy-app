import { createFileRoute } from "@tanstack/react-router";
import { asc, eq } from "drizzle-orm";
import { getSessionUser } from "@/server/auth";
import { db, schema } from "@/server/db";

export const Route = createFileRoute("/api/pts")({
  server: {
    handlers: {
      GET: async () => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        const pts = await db
          .select({
            id: schema.users.id,
            displayName: schema.users.displayName,
            email: schema.users.email,
          })
          .from(schema.users)
          .where(eq(schema.users.role, "pt"))
          .orderBy(asc(schema.users.displayName));
        return json({ pts });
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
