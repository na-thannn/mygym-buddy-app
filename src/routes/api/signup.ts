import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import { newId, hashPassword, createSession, setSessionCookie } from "@/server/auth";
import { parseRequestBody } from '@/lib/request-utils'
import logDevError from '@/lib/error-logger'

const inputSchema = z.object({ email: z.string().email(), password: z.string().min(6), displayName: z.string().min(1) });

export const Route = createFileRoute("/api/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          logDevError({ error: new Error('signup: request snapshot'), req: { keys: Object.keys(request || {}).slice(0, 20), hasRequestProp: !!request?.request, outerJsonType: typeof request?.json, innerJsonType: typeof request?.request?.json } }).catch(() => {});
        } catch (_) {}
        let body: any = await parseRequestBody(request);
        if (!body || Object.keys(body).length === 0) {
          try {
            if (typeof request?.text === 'function') {
              const txt = await request.text();
              body = txt ? JSON.parse(txt) : {};
            } else if (typeof request?.request?.text === 'function') {
              const txt = await request.request.text();
              body = txt ? JSON.parse(txt) : {};
            } else if (request?.body) {
              body = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
            }
          } catch (_) {}
        }
        if (!body || Object.keys(body).length === 0) {
          return new Response(JSON.stringify({ error: 'Empty request body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        let data: any;
        try {
          data = inputSchema.parse(body);
        } catch (err: any) {
          return new Response(JSON.stringify({ error: 'Invalid input', details: err?.errors ?? String(err) }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const existing = db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, data.email)).get();
        if (existing) return new Response(JSON.stringify({ error: 'Email is already in use' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        const id = newId();
        try {
          db.insert(schema.users).values({ id, email: data.email, passwordHash: hashPassword(data.password), displayName: data.displayName }).run();
          db.insert(schema.profiles).values({ userId: id }).run();
          const { token, expiresAt } = createSession(id);
          setSessionCookie(token, expiresAt);
          return new Response(JSON.stringify({ id, email: data.email, displayName: data.displayName }), { status: 201, headers: { 'Content-Type': 'application/json' } });
        } catch (err: any) {
          await logDevError({ error: err, req: { method: 'POST', url: '/api/signup', body } }).catch(() => {});
          return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
      },
    },
  },
});
