import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import { requireManagerSession, json } from "@/server/crm";
import { db, schema } from "@/server/db";
import { newId } from "@/server/auth";

const eventSchema = z.object({
  id: z.string().optional(),
  titleEn: z.string().trim().min(1).max(140),
  titleVi: z.string().trim().min(1).max(140),
  descriptionEn: z.string().max(1500).optional().default(""),
  descriptionVi: z.string().max(1500).optional().default(""),
  eventType: z.string().trim().min(1).max(80).default("class"),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  imagePath: z.string().nullable().optional(),
  relatedClassId: z.string().nullable().optional(),
  active: z.number().int().min(0).max(1).default(1),
  isPublic: z.number().int().min(0).max(1).default(1),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const Route = createFileRoute("/api/manager/events")({
  server: {
    handlers: {
      GET: async () => {
        await requireManagerSession();
        const events = await db
          .select()
          .from(schema.publicEvents)
          .orderBy(asc(schema.publicEvents.sortOrder), desc(schema.publicEvents.createdAt));
        return json({ events });
      },
      POST: async (ctx: unknown) => {
        const session = await requireManagerSession();
        const maybe = ctx as { request?: Request };
        const request = maybe.request ?? (ctx as Request);
        const parsed = eventSchema.safeParse(await parseRequestBody(request as unknown));
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);
        const id = parsed.data.id || newId();
        const { id: _inputId, ...eventData } = parsed.data;
        const values = {
          ...eventData,
          id,
          startsAt: eventData.startsAt ?? null,
          endsAt: eventData.endsAt ?? null,
          imagePath: eventData.imagePath ?? null,
          relatedClassId: eventData.relatedClassId ?? null,
          updatedAt: new Date().toISOString(),
        };
        if (parsed.data.id) {
          await db
            .update(schema.publicEvents)
            .set({
              ...eventData,
              startsAt: values.startsAt,
              endsAt: values.endsAt,
              imagePath: values.imagePath,
              relatedClassId: values.relatedClassId,
              updatedAt: values.updatedAt,
            })
            .where(eq(schema.publicEvents.id, id));
        } else {
          await db.insert(schema.publicEvents).values(values);
        }
        await db.insert(schema.auditLogs).values({
          id: newId(),
          actorId: session.userId,
          action: parsed.data.id ? "public_event.update" : "public_event.create",
          entityType: "public_event",
          entityId: id,
          afterJson: JSON.stringify(values),
        });
        return json({ ok: true, id });
      },
      DELETE: async (ctx: unknown) => {
        const session = await requireManagerSession();
        const maybe = ctx as { request?: Request };
        const request = maybe.request ?? (ctx as Request);
        const body = z.object({ id: z.string().min(1) }).parse(await parseRequestBody(request));
        await db
          .update(schema.publicEvents)
          .set({ active: 0, isPublic: 0, updatedAt: new Date().toISOString() })
          .where(eq(schema.publicEvents.id, body.id));
        await db.insert(schema.auditLogs).values({
          id: newId(),
          actorId: session.userId,
          action: "public_event.deactivate",
          entityType: "public_event",
          entityId: body.id,
        });
        return json({ ok: true });
      },
    },
  },
});
