import { createFileRoute } from '@tanstack/react-router'
import { readSessionCookie, validateSessionToken, newId } from '@/server/auth'
import { db, schema } from '@/server/db'
import { eq, desc } from 'drizzle-orm'
import { parseRequestBody } from '@/lib/request-utils'
import logDevError from '@/lib/error-logger'

export const Route = createFileRoute('/api/inbody')({
  server: {
    handlers: {
      GET: async () => {
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session) return new Response(null, { status: 204 });
        const rows = db
          .select()
          .from(schema.inbodyReports)
          .where(eq(schema.inbodyReports.userId, session.userId))
          .orderBy(desc(schema.inbodyReports.reportDate))
          .all();
        return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
      POST: async (request: any) => {
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
          const body: any = await parseRequestBody(request);

        const reportDate = body?.reportDate ?? body?.date ?? null;
        if (!reportDate) {
          return new Response(JSON.stringify({ error: 'Missing reportDate' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const weightKg = typeof body.weightKg === 'number' ? body.weightKg : (typeof body.weight === 'number' ? body.weight : undefined);
        if (weightKg === undefined) {
          return new Response(JSON.stringify({ error: 'Missing weightKg' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const muscleMassKg = typeof body.muscleMassKg === 'number' ? body.muscleMassKg : (typeof body.muscleMass === 'number' ? body.muscleMass : undefined);
        if (muscleMassKg === undefined) {
          return new Response(JSON.stringify({ error: 'Missing muscleMassKg' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const id = newId();
        try {
          db.insert(schema.inbodyReports).values({ id, userId: session.userId, reportDate, weightKg, muscleMassKg, bodyFatPercent: body.bodyFatPercent ?? body.bodyFat }).run();
          return new Response(JSON.stringify({ ok: true, id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (err: any) {
          await logDevError({ error: err, req: { method: 'POST', url: '/api/inbody', body } }).catch(() => {});
          return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
      },
    },
  },
})
