import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { db, schema } from "@/server/db";
import { eq } from "drizzle-orm";
import { newId, hashPassword, createSession, setSessionCookie } from "@/server/auth";
import { parseRequestBody } from "@/lib/request-utils";
import logDevError from "@/lib/error-logger";
import type { MaybeWrappedRequest } from "@/types/dev";
import { canUsePublicSignup, PUBLIC_SIGNUP_DISABLED_ERROR } from "@/lib/signup-policy";
import { authEmailSchema } from "@/lib/auth-input";

const inputSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(6),
  displayName: z.string().min(1),
  autoSignIn: z.boolean().optional().default(false),
  bootstrapAdmin: z.boolean().optional().default(false),
});

type SignupInput = z.infer<typeof inputSchema>;

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

        let data: SignupInput;
        try {
          data = inputSchema.parse(body as unknown);
        } catch (err: unknown) {
          const details = err instanceof z.ZodError ? err.errors : String(err);
          return new Response(JSON.stringify({ error: "Invalid input", details }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const [existing] = await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.email, data.email))
          .limit(1);
        if (!canUsePublicSignup(data.bootstrapAdmin)) {
          return new Response(JSON.stringify({ error: PUBLIC_SIGNUP_DISABLED_ERROR }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
        const [anyUser] = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
        if (anyUser) {
          return new Response(JSON.stringify({ error: "Admin bootstrap is no longer available" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (existing)
          return new Response(JSON.stringify({ error: "Email is already in use" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        const [adminExists] = await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.role, "admin"))
          .limit(1);
        const id = newId();
        try {
          await db
            .insert(schema.users)
            .values({
              id,
              email: data.email,
              passwordHash: hashPassword(data.password),
              displayName: data.displayName,
              role: adminExists ? "customer" : "admin",
              mustChangePassword: 0,
            });
          await db.insert(schema.profiles).values({ userId: id });
          // Only create a session and set the cookie if the client explicitly requested auto sign-in.
          if (data.autoSignIn === true) {
            const { token, expiresAt } = await createSession(id);
            setSessionCookie(token, expiresAt);
          }
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
