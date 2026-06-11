import { createServerFn } from "@tanstack/react-start";
import logDevError from "@/lib/error-logger";
import { authEmailSchema } from "@/lib/auth-input";
import { canUsePublicSignup, PUBLIC_SIGNUP_DISABLED_ERROR } from "@/lib/signup-policy";
import { z } from "zod";
import { eq } from "drizzle-orm";

const signUpInput = z.object({
  email: authEmailSchema,
  password: z.string().min(6).max(128),
  displayName: z.string().trim().min(1).max(60),
  bootstrapAdmin: z.boolean().optional().default(false),
});

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => signUpInput.parse(data))
  .handler(async ({ data }) => {
    if (!canUsePublicSignup(data.bootstrapAdmin)) {
      throw new Error(PUBLIC_SIGNUP_DISABLED_ERROR);
    }
    const { db, schema } = await import("@/server/db");
    const { createSession, hashPassword, setSessionCookie, newId } = await import("@/server/auth");
    const [anyUser] = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
    if (anyUser) {
      throw new Error("Admin bootstrap is no longer available.");
    }
    const [existing] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, data.email))
      .limit(1);
    if (existing) throw new Error("Email is already in use");
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
      const { token, expiresAt } = await createSession(id);
      setSessionCookie(token, expiresAt);
      return { id, email: data.email, displayName: data.displayName };
    } catch (err) {
      await logDevError({ error: err, req: null }).catch(() => {});
      throw new Response("Server error", { status: 500 });
    }
  });

const signInInput = z.object({
  email: authEmailSchema,
  password: z.string().min(1).max(128),
});

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => signInInput.parse(data))
  .handler(async ({ data }) => {
    const { db, schema } = await import("@/server/db");
    const { createSession, verifyPassword, setSessionCookie } = await import("@/server/auth");
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, data.email))
      .limit(1);
    if (!user || !verifyPassword(data.password, user.passwordHash)) {
      throw new Error("Email or password is incorrect");
    }
    const { token, expiresAt } = await createSession(user.id);
    setSessionCookie(token, expiresAt);
    return { id: user.id, email: user.email, displayName: user.displayName };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { readSessionCookie, invalidateSessionToken, clearSessionCookie } =
    await import("@/server/auth");
  const token = readSessionCookie();
  if (token) await invalidateSessionToken(token);
  clearSessionCookie();
  return { ok: true };
});

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { readSessionCookie, validateSessionToken } = await import("@/server/auth");
  const token = readSessionCookie();
  if (!token) return null;
  const session = await validateSessionToken(token);
  if (!session) return null;
  return {
    id: session.userId,
    email: session.email,
    displayName: session.displayName,
    role: session.role,
    mustChangePassword: session.mustChangePassword,
  };
});
