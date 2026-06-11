import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import { hasAnyRole } from "@/lib/roles";
import { db, schema } from "@/server/db";
import { getSessionUser, newId } from "@/server/auth";

const createSchema = z.object({
  ptId: z.string().min(1).optional(),
  unavailableDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(160).optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1),
});

export const Route = createFileRoute("/api/pt-unavailable-days")({
  server: {
    handlers: {
      GET: async () => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        if (session.role === "pt") {
          return json({
            days: await db
              .select()
              .from(schema.ptUnavailableDays)
              .where(eq(schema.ptUnavailableDays.ptId, session.userId))
              .orderBy(desc(schema.ptUnavailableDays.unavailableDate)),
          });
        }
        if (!hasAnyRole(session, ["admin", "manager"])) return json({ error: "Forbidden" }, 403);
        return json({
          days: await db
            .select()
            .from(schema.ptUnavailableDays)
            .orderBy(desc(schema.ptUnavailableDays.unavailableDate))
            .limit(300),
        });
      },
      POST: async (ctx: unknown) => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const body = await parseRequestBody(request as unknown);
        const parsed = createSchema.safeParse(body);
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
        if (session.role !== "pt" && !hasAnyRole(session, ["admin", "manager"])) {
          return json({ error: "Forbidden" }, 403);
        }
        if (hasAnyRole(session, ["admin", "manager"]) && !parsed.data.ptId) {
          return json({ error: "ptId required" }, 400);
        }
        const targetPtId = hasAnyRole(session, ["admin", "manager"])
          ? parsed.data.ptId!
          : session.userId;
        const [pt] = await db
          .select({ id: schema.users.id, role: schema.users.role })
          .from(schema.users)
          .where(eq(schema.users.id, targetPtId))
          .limit(1);
        if (!pt || pt.role !== "pt") return json({ error: "PT not found" }, 400);
        const [existing] = await db
          .select({ id: schema.ptUnavailableDays.id })
          .from(schema.ptUnavailableDays)
          .where(
            and(
              eq(schema.ptUnavailableDays.ptId, targetPtId),
              eq(schema.ptUnavailableDays.unavailableDate, parsed.data.unavailableDate),
            ),
          )
          .limit(1);
        if (existing) return json({ ok: true, id: existing.id });
        const id = newId();
        await db
          .insert(schema.ptUnavailableDays)
          .values({
            id,
            ptId: targetPtId,
            unavailableDate: parsed.data.unavailableDate,
            reason: parsed.data.reason?.trim() || null,
          });
        return json({ ok: true, id });
      },
      DELETE: async (ctx: unknown) => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const body = await parseRequestBody(request as unknown);
        const parsed = deleteSchema.safeParse(body);
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
        const [row] = await db
          .select()
          .from(schema.ptUnavailableDays)
          .where(eq(schema.ptUnavailableDays.id, parsed.data.id))
          .limit(1);
        if (!row) return json({ error: "Unavailable day not found" }, 404);
        if (!hasAnyRole(session, ["admin", "manager"]) && row.ptId !== session.userId) {
          return json({ error: "Forbidden" }, 403);
        }
        await db.delete(schema.ptUnavailableDays).where(eq(schema.ptUnavailableDays.id, parsed.data.id));
        return json({ ok: true });
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
