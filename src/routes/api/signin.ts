import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import { hashPassword, createSession, setSessionCookie } from "@/server/auth";
import { parseRequestBody } from '@/lib/request-utils'
import logDevError from '@/lib/error-logger'

const inputSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

export const Route = createFileRoute("/api/signin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          try {
            logDevError({ error: new Error('signin: request snapshot'), req: { keys: Object.keys(request || {}).slice(0, 20), hasRequestProp: !!request?.request, outerJsonType: typeof request?.json, innerJsonType: typeof request?.request?.json } }).catch(() => {});
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
          const parsed = inputSchema.safeParse(body);
          if (!parsed.success) {
            return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { "Content-Type": "application/json" } });
          }
          const data = parsed.data;
          const user = db.select().from(schema.users).where(eq(schema.users.email, data.email)).get();
          if (!user) {
            return new Response(JSON.stringify({ error: "Email or password is incorrect" }), { status: 400, headers: { "Content-Type": "application/json" } });
          }
          const { verifyPassword } = await import("@/server/auth");
          const verified = await verifyPassword(data.password, user.passwordHash ?? user.password_hash ?? user.password_hash);
          if (!verified) {
            return new Response(JSON.stringify({ error: "Email or password is incorrect" }), { status: 400, headers: { "Content-Type": "application/json" } });
          }
          const { token, expiresAt } = createSession(user.id);
          setSessionCookie(token, expiresAt);
          return new Response(JSON.stringify({ id: user.id, email: user.email, displayName: user.displayName ?? user.display_name }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          await logDevError({ error: err, req: { method: 'POST', url: '/api/signin' } }).catch(() => {});
          return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
