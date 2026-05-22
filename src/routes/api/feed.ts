import { createFileRoute } from '@tanstack/react-router'
import { readSessionCookie, validateSessionToken, newId } from '@/server/auth'
import { db, schema } from '@/server/db'
import { eq, desc } from 'drizzle-orm'
import { parseRequestBody } from '@/lib/request-utils'
import logDevError from '@/lib/error-logger'

export const Route = createFileRoute('/api/feed')({
  server: {
    handlers: {
      GET: async () => {
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session) return new Response(null, { status: 204 });
        const rows = db
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
          .limit(50)
          .all();
        return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
      POST: async (request: any) => {
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        const body: any = await parseRequestBody(request);
        if (!body || (!body.content && !body.imageBase64)) return new Response(JSON.stringify({ error: 'Missing content or imageBase64' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        const id = newId();
        try {
          db.insert(schema.communityFeed).values({ id, userId: session.userId, ...body }).run();
          return new Response(JSON.stringify({ ok: true, id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (err: any) {
          await logDevError({ error: err, req: { method: 'POST', url: '/api/feed', body } }).catch(() => {});
          return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
      },
    },
  },
})
