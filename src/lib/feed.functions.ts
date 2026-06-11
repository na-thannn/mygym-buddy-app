import { createServerFn } from "@tanstack/react-start";
import logDevError from "@/lib/error-logger";
import { z } from "zod";
import { desc } from "drizzle-orm";

async function requireSession() {
  const { readSessionCookie, validateSessionToken } = await import("@/server/auth");
  const token = readSessionCookie();
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const session = await validateSessionToken(token);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return session;
}

const inputSchema = z.object({
  content: z.string().min(1).max(500),
  imageBase64: z.string().optional().nullable(),
});

export const addFeedPost = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const session = await requireSession();
    const { db, schema } = await import("@/server/db");
    const { newId } = await import("@/server/auth");

    const id = newId();
    try {
      await db.insert(schema.communityFeed).values({ id, userId: session.userId, ...data });
      return { ok: true, id };
    } catch (err) {
      await logDevError({ error: err, req: null }).catch(() => {});
      throw new Response("Server error", { status: 500 });
    }
  });

export const listFeedPosts = createServerFn({ method: "GET" }).handler(async () => {
  const session = await requireSession(); // Ensure user is logged in
  const { db, schema } = await import("@/server/db");
  const { eq } = await import("drizzle-orm");

  const rows = await db
    .select({
      id: schema.communityFeed.id,
      content: schema.communityFeed.content,
      imageBase64: schema.communityFeed.imageBase64,
      likesCount: schema.communityFeed.likesCount,
      createdAt: schema.communityFeed.createdAt,
      authorName: schema.users.displayName,
    })
    .from(schema.communityFeed)
    .leftJoin(schema.users, eq(schema.communityFeed.userId, schema.users.id))
    .orderBy(desc(schema.communityFeed.createdAt))
    .limit(50);

  return rows;
});
