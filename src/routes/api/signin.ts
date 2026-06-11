import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import { hashPassword, createSession, setSessionCookie } from "@/server/auth";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import type { MaybeWrappedRequest } from "@/types/dev";
import { authEmailSchema } from "@/lib/auth-input";

const inputSchema = z.object({ email: authEmailSchema, password: z.string().min(1) });

export const Route = createFileRoute("/api/signin")({
  server: {
    handlers: {
      POST: async (ctx: unknown) => {
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const reqWrapped = request as unknown as MaybeWrappedRequest;
        const innerWrapped = maybe.request
          ? (maybe.request as unknown as MaybeWrappedRequest)
          : undefined;
        try {
          try {
            logDevError({
              error: new Error("signin: request snapshot"),
              req: {
                keys: Object.keys(request || {}).slice(0, 20),
                hasRequestProp: !!maybe.request,
                outerJsonType: typeof reqWrapped.json,
                innerJsonType: typeof innerWrapped?.json,
              },
            }).catch(() => {});
          } catch (_) {}
          let body: unknown = await parseRequestBody(request as unknown);
          if (
            !body ||
            (typeof body === "object" && Object.keys(body as Record<string, unknown>).length === 0)
          ) {
            try {
              if (typeof reqWrapped.text === "function") {
                const txt = await (reqWrapped as unknown as Request).text();
                body = txt ? JSON.parse(txt) : {};
              } else if (maybe.request && typeof innerWrapped?.text === "function") {
                const txt = await (innerWrapped as unknown as Request).text();
                body = txt ? JSON.parse(txt) : {};
              } else if (reqWrapped?.body) {
                body =
                  typeof reqWrapped.body === "string"
                    ? JSON.parse(reqWrapped.body as string)
                    : reqWrapped.body;
              }
            } catch (_) {}
          }
          const parsed = inputSchema.safeParse(body);
          if (!parsed.success) {
            return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
          const data = parsed.data;
          const [user] = await db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, data.email))
            .limit(1);
          if (!user) {
            return new Response(JSON.stringify({ error: "Email or password is incorrect" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
          const { verifyPassword } = await import("@/server/auth");
          const verified = await verifyPassword(data.password, user.passwordHash);
          if (!verified) {
            return new Response(JSON.stringify({ error: "Email or password is incorrect" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }
          const { token, expiresAt } = await createSession(user.id);
          setSessionCookie(token, expiresAt);
          return new Response(
            JSON.stringify({
              id: user.id,
              email: user.email,
              displayName: user.displayName,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        } catch (err: unknown) {
          await logDevError({ error: err, req: { method: "POST", url: "/api/signin" } }).catch(
            () => {},
          );
          return new Response(JSON.stringify({ error: "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
