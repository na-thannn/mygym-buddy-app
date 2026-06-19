import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { getSessionUser, newId } from "@/server/auth";
import { db, schema } from "@/server/db";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getRequest(ctx: unknown): Request {
  const maybe = ctx as { request?: Request };
  return maybe.request ?? (ctx as Request);
}

async function requireAdmin() {
  const session = await getSessionUser();
  if (!session) return { error: json({ error: "Unauthorized" }, 401) };
  if (session.role !== "admin") return { error: json({ error: "Forbidden" }, 403) };
  return { session };
}

const addSchema = z.object({
  imageBase64: z.string().min(1).max(8_000_000),
  caption: z.string().max(300).optional().nullable(),
});

const updateSchema = z.object({
  id: z.string().min(1),
  caption: z.string().max(300).optional().nullable(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isPublic: z.boolean().optional(),
});

const deleteSchema = z.object({ id: z.string().min(1) });

export const Route = createFileRoute("/api/admin/gym-photos")({
  server: {
    handlers: {
      POST: async (ctx: unknown) => {
        const auth = await requireAdmin();
        if (auth.error) return auth.error;
        const body = await parseRequestBody(getRequest(ctx) as unknown);
        const parsed = addSchema.safeParse(body ?? {});
        if (!parsed.success) {
          return json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
        }
        try {
          const [last] = await db
            .select({ sortOrder: schema.gymPhotos.sortOrder })
            .from(schema.gymPhotos)
            .orderBy(desc(schema.gymPhotos.sortOrder))
            .limit(1);
          const id = newId();
          await db.insert(schema.gymPhotos).values({
            id,
            imageBase64: parsed.data.imageBase64,
            caption: parsed.data.caption ?? null,
            sortOrder: (last?.sortOrder ?? 0) + 1,
          });
          return json({ ok: true, id });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/admin/gym-photos" },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
      PATCH: async (ctx: unknown) => {
        const auth = await requireAdmin();
        if (auth.error) return auth.error;
        const body = await parseRequestBody(getRequest(ctx) as unknown);
        const parsed = updateSchema.safeParse(body ?? {});
        if (!parsed.success) {
          return json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
        }
        const data = parsed.data;
        const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
        if (Object.prototype.hasOwnProperty.call(data, "caption"))
          patch.caption = data.caption ?? null;
        if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
        if (data.isPublic !== undefined) patch.isPublic = data.isPublic ? 1 : 0;
        try {
          await db.update(schema.gymPhotos).set(patch).where(eq(schema.gymPhotos.id, data.id));
          return json({ ok: true });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "PATCH", url: "/api/admin/gym-photos" },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
      DELETE: async (ctx: unknown) => {
        const auth = await requireAdmin();
        if (auth.error) return auth.error;
        const body = await parseRequestBody(getRequest(ctx) as unknown);
        const parsed = deleteSchema.safeParse(body ?? {});
        if (!parsed.success) {
          return json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
        }
        try {
          await db.delete(schema.gymPhotos).where(eq(schema.gymPhotos.id, parsed.data.id));
          return json({ ok: true });
        } catch (err) {
          await logDevError({
            error: err,
            req: { method: "DELETE", url: "/api/admin/gym-photos" },
          }).catch(() => {});
          return json({ error: "Server error" }, 500);
        }
      },
    },
  },
});
