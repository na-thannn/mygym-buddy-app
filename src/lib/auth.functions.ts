import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@/server/db";
import {
  createSession,
  hashPassword,
  verifyPassword,
  setSessionCookie,
  clearSessionCookie,
  invalidateSessionToken,
  readSessionCookie,
  validateSessionToken,
  newId,
} from "@/server/auth";

const signUpInput = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(6).max(128),
  displayName: z.string().trim().min(1).max(60),
});

export const signUp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => signUpInput.parse(data))
  .handler(async ({ data }) => {
    const existing = db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, data.email)).get();
    if (existing) throw new Error("Email đã được sử dụng");
    const id = newId();
    db.insert(schema.users).values({
      id,
      email: data.email,
      passwordHash: hashPassword(data.password),
      displayName: data.displayName,
    }).run();
    db.insert(schema.profiles).values({ userId: id }).run();
    const { token, expiresAt } = createSession(id);
    setSessionCookie(token, expiresAt);
    return { id, email: data.email, displayName: data.displayName };
  });

const signInInput = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128),
});

export const signIn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => signInInput.parse(data))
  .handler(async ({ data }) => {
    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, data.email))
      .get();
    if (!user || !verifyPassword(data.password, user.passwordHash)) {
      throw new Error("Email hoặc mật khẩu không đúng");
    }
    const { token, expiresAt } = createSession(user.id);
    setSessionCookie(token, expiresAt);
    return { id: user.id, email: user.email, displayName: user.displayName };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const token = readSessionCookie();
  if (token) invalidateSessionToken(token);
  clearSessionCookie();
  return { ok: true };
});

export const getCurrentUser = createServerFn({ method: "GET" }).handler(async () => {
  const token = readSessionCookie();
  if (!token) return null;
  const session = validateSessionToken(token);
  if (!session) return null;
  return { id: session.userId, email: session.email, displayName: session.displayName };
});