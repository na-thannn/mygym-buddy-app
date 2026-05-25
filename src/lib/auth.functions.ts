import { createServerFn } from "@tanstack/react-start";
import logDevError from "@/lib/error-logger";
import { z } from "zod";
import { eq } from "drizzle-orm";

const signUpInput = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(6).max(128),
  displayName: z.string().trim().min(1).max(60),
});

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => signUpInput.parse(data))
  .handler(async ({ data }) => {
    const { db, schema } = await import("@/server/db");
    const { createSession, hashPassword, setSessionCookie, newId } = await import("@/server/auth");
    const existing = db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, data.email))
      .get();
    if (existing) throw new Error("Email is already in use");
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
      return { id, email: data.email, displayName: data.displayName };
    } catch (err) {
      await logDevError({ error: err, req: null }).catch(() => {});
      throw new Response("Server error", { status: 500 });
    }
  });

const signInInput = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128),
});

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => signInInput.parse(data))
  .handler(async ({ data }) => {
    const { db, schema } = await import("@/server/db");
    const { createSession, verifyPassword, setSessionCookie } = await import("@/server/auth");
    const user = db.select().from(schema.users).where(eq(schema.users.email, data.email)).get();
    if (!user || !verifyPassword(data.password, user.passwordHash)) {
      throw new Error("Email or password is incorrect");
    }
    const { token, expiresAt } = createSession(user.id);
    setSessionCookie(token, expiresAt);
    return { id: user.id, email: user.email, displayName: user.displayName };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const { readSessionCookie, invalidateSessionToken, clearSessionCookie } =
    await import("@/server/auth");
  const token = readSessionCookie();
  if (token) invalidateSessionToken(token);
  clearSessionCookie();
  return { ok: true };
});

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const { readSessionCookie, validateSessionToken } = await import("@/server/auth");
  const token = readSessionCookie();
  if (!token) return null;
  const session = validateSessionToken(token);
  if (!session) return null;
  return { id: session.userId, email: session.email, displayName: session.displayName };
});
