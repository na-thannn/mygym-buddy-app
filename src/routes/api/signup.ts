import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import { newId, hashPassword, createSession, setSessionCookie } from "@/server/auth";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import type { MaybeWrappedRequest } from "@/types/dev";

const inputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1),
});

export const Route = createFileRoute("/api/signup")({
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
          logDevError({
            error: new Error("signup: request snapshot"),
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
            if (typeof (reqWrapped as unknown as Request).text === "function") {
              const txt = await (reqWrapped as unknown as Request).text();
              body = txt ? JSON.parse(txt) : {};
            } else if (
              maybe.request &&
              typeof (innerWrapped as unknown as Request).text === "function"
            ) {
              const txt = await (innerWrapped as unknown as Request).text();
              body = txt ? JSON.parse(txt) : {};
            } else if ((reqWrapped as MaybeWrappedRequest)?.body) {
              body =
                typeof (reqWrapped as MaybeWrappedRequest).body === "string"
                  ? JSON.parse((reqWrapped as MaybeWrappedRequest).body as string)
                  : (reqWrapped as MaybeWrappedRequest).body;
            }
          } catch (_) {
            /* ignore */
          }
        }

        if (
          !body ||
          (typeof body === "object" && Object.keys(body as Record<string, unknown>).length === 0)
        ) {
          return new Response(JSON.stringify({ error: "Empty request body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        let data;
        try {
          data = inputSchema.parse(body as unknown);
        } catch (err: unknown) {
          const details = err instanceof z.ZodError ? err.errors : String(err);
          return new Response(JSON.stringify({ error: "Invalid input", details }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const existing = db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.email, data.email))
          .get();
        if (existing)
          return new Response(JSON.stringify({ error: "Email is already in use" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        const id = newId();
        try {
          db.insert(schema.users)
            .values({
              id,
              email: data.email,
              passwordHash: hashPassword(data.password),
              displayName: data.displayName,
            })
            .run();
          db.insert(schema.profiles).values({ userId: id }).run();
          const { token, expiresAt } = createSession(id);
          setSessionCookie(token, expiresAt);
          return new Response(
            JSON.stringify({ id, email: data.email, displayName: data.displayName }),
            { status: 201, headers: { "Content-Type": "application/json" } },
          );
        } catch (err: unknown) {
          await logDevError({
            error: err,
            req: { method: "POST", url: "/api/signup", body },
          }).catch(() => {});
          return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
