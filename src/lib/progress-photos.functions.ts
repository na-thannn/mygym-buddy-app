import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";

async function requireSession() {
  const { readSessionCookie, validateSessionToken } = await import("@/server/auth");
  const token = readSessionCookie();
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const session = validateSessionToken(token);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return session;
}

const inputSchema = z.object({
  imageBase64: z.string().min(1),
});

export const addProgressPhoto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const { newId } = await import("@/server/auth");
    
      const id = newId();
      try {
        db.insert(schema.progressPhotos).values({ id, userId: session.userId, imageBase64: data.imageBase64, notes: data.notes ?? null }).run();
        return { ok: true, id };
      } catch (err: any) {
        await logDevError({ error: err, req: null }).catch(() => {});
        throw new Response('Server error', { status: 500 });
      }
  });

export const listProgressPhotos = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    
    return db
      .select()
      .from(schema.progressPhotos)
      .where(eq(schema.progressPhotos.userId, session.userId))
      .orderBy(desc(schema.progressPhotos.createdAt))
      .limit(20)
      .all();
  });