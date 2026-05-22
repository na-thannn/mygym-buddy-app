import { createFileRoute } from '@tanstack/react-router'
import { readSessionCookie, validateSessionToken, newId } from '@/server/auth'
import { db, schema } from '@/server/db'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { parseRequestBody } from '@/lib/request-utils'
import logDevError from '@/lib/error-logger'

export const Route = createFileRoute('/api/log/workout')({
  server: {
    handlers: {
      GET: async (request: Request) => {
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session) return new Response(null, { status: 204 });
        const url = new URL(request.url);
        const fromDate = url.searchParams.get('fromDate');
        const toDate = url.searchParams.get('toDate');
        const limit = Number(url.searchParams.get('limit') || '50');
        const where = [eq(schema.workoutLogs.userId, session.userId)];
        if (fromDate) where.push(gte(schema.workoutLogs.performedAt, fromDate));
        if (toDate) where.push(lte(schema.workoutLogs.performedAt, toDate));
        const rows = db
          .select()
          .from(schema.workoutLogs)
          .where(and(...where))
          .orderBy(desc(schema.workoutLogs.performedAt), desc(schema.workoutLogs.createdAt))
          .limit(limit)
          .all();
        return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
      POST: async (request: any) => {
        const token = readSessionCookie();
        const session = token ? validateSessionToken(token) : null;
        if (!session) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        const body: any = await parseRequestBody(request);
        if (!body || !body.exercise) return new Response(JSON.stringify({ error: 'Missing exercise' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        const id = newId();
        const exercise = typeof body.exercise === 'string' ? body.exercise : String(body.exercise ?? '');
        const sets = typeof body.sets === 'number' ? body.sets : body.sets ? Number(body.sets) : null;
        const reps = body.reps ? String(body.reps) : null;
        const weightKg = typeof body.weightKg === 'number' ? body.weightKg : (typeof body.weight === 'number' ? body.weight : null);
        const performedAt = body.performedAt ?? body.date ?? new Date().toISOString().slice(0, 10);
        try {
          db.insert(schema.workoutLogs).values({ id, userId: session.userId, performedAt, exercise, sets, reps, weightKg, notes: body.notes ?? null, dayLabel: body.dayLabel ?? null, muscleGroup: body.muscleGroup ?? null }).run();
          return new Response(JSON.stringify({ ok: true, id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (err: any) {
          await logDevError({ error: err, req: { method: 'POST', url: '/api/log/workout', body } }).catch(() => {});
          return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
      },
    },
  },
})
