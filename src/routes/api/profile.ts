import { createFileRoute } from '@tanstack/react-router'
import { readSessionCookie, validateSessionToken } from '@/server/auth'
import { db, schema } from '@/server/db'
import { eq } from 'drizzle-orm'
import { parseRequestBody } from '@/lib/request-utils'
import logDevError from '@/lib/error-logger'

export const Route = createFileRoute('/api/profile')({
  server: {
    handlers: {
      GET: async () => {
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session) return new Response(null, { status: 204 });
        const row = db.select().from(schema.profiles).where(eq(schema.profiles.userId, session.userId)).get();
        return new Response(JSON.stringify(row ?? null), { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
      POST: async (request: any) => {
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        const body: any = await parseRequestBody(request);
        const existing = db.select({ userId: schema.profiles.userId }).from(schema.profiles).where(eq(schema.profiles.userId, session.userId)).get();
        const patch = { ...body, updatedAt: new Date().toISOString() };
        try {
          if (existing) {
            db.update(schema.profiles).set(patch).where(eq(schema.profiles.userId, session.userId)).run();
          } else {
            db.insert(schema.profiles).values({ userId: session.userId, ...patch }).run();
          }
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (err: any) {
          await logDevError({ error: err, req: { method: 'POST', url: '/api/profile', body: patch } }).catch(() => {});
          return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
      },
    },
  },
})
