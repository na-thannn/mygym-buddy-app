import { createFileRoute } from '@tanstack/react-router'
import { readSessionCookie, validateSessionToken, newId } from '@/server/auth'
import { db, schema } from '@/server/db'
import { eq, desc } from 'drizzle-orm'
import { parseRequestBody } from '@/lib/request-utils'
import logDevError from '@/lib/error-logger'

export const Route = createFileRoute('/api/plans')({
  server: {
    handlers: {
      GET: async () => {
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session) return new Response(null, { status: 204 });
        const rows = db
          .select()
          .from(schema.workoutPlanDocs)
          .where(eq(schema.workoutPlanDocs.userId, session.userId))
          .orderBy(desc(schema.workoutPlanDocs.planDate), desc(schema.workoutPlanDocs.createdAt))
          .limit(100)
          .all();
        return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
      POST: async (request: any) => {
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        const body: any = await parseRequestBody(request);
        if (!body || !body.planDate) return new Response(JSON.stringify({ error: 'Missing planDate' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        if (!body.contentMd) return new Response(JSON.stringify({ error: 'Missing contentMd' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        const id = newId();
        try {
          db.insert(schema.workoutPlanDocs).values({ id, userId: session.userId, planDate: body.planDate, title: body.title ?? null, contentMd: body.contentMd }).run();
          return new Response(JSON.stringify({ ok: true, id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (err: any) {
          await logDevError({ error: err, req: { method: 'POST', url: '/api/plans', body } }).catch(() => {});
          return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
      },
    },
  },
})
