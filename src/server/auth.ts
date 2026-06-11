import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import logDevError from "@/lib/error-logger";
import { sha256 } from "@oslojs/crypto/sha2";
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { eq } from "drizzle-orm";
import { createMiddleware } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { db, schema } from "./db";
import { hasAnyRole, normalizeRole, type AppRole } from "@/lib/roles";

const SESSION_COOKIE = "alex_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

function hashSessionToken(token: string): string {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: number }> {
  const token = generateSessionToken();
  const sessionId = hashSessionToken(token);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  try {
    await db.insert(schema.sessions).values({ id: sessionId, userId, expiresAt });
    return { token, expiresAt };
  } catch (err) {
    logDevError({ error: err, req: null }).catch(() => {});
    throw new Error("Failed to create session");
  }
}

export type AuthSession = {
  userId: string;
  email: string;
  displayName: string;
  role: AppRole;
  mustChangePassword: boolean;
};

export async function validateSessionToken(token: string): Promise<AuthSession | null> {
  const sessionId = hashSessionToken(token);
  const [row] = await db
    .select({
      sessionId: schema.sessions.id,
      userId: schema.sessions.userId,
      expiresAt: schema.sessions.expiresAt,
      email: schema.users.email,
      displayName: schema.users.displayName,
      role: schema.users.role,
      mustChangePassword: schema.users.mustChangePassword,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);
  if (!row) return null;
  const now = Math.floor(Date.now() / 1000);
  if (row.expiresAt < now) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
    return null;
  }
  return {
    userId: row.userId,
    email: row.email,
    displayName: row.displayName,
    role: normalizeRole(row.role),
    mustChangePassword: row.mustChangePassword === 1,
  };
}

export async function invalidateSessionToken(token: string) {
  const sessionId = hashSessionToken(token);
  await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

export function setSessionCookie(token: string, expiresAtSeconds: number) {
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAtSeconds * 1000),
  });
}

export function clearSessionCookie() {
  deleteCookie(SESSION_COOKIE, { path: "/" });
}

export function readSessionCookie(): string | undefined {
  return getCookie(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<AuthSession | null> {
  const token = readSessionCookie();
  return token ? validateSessionToken(token) : null;
}

export async function requireSessionUser(): Promise<AuthSession> {
  const session = await getSessionUser();
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return session;
}

export async function requireRole(roles: readonly AppRole[]): Promise<AuthSession> {
  const session = await requireSessionUser();
  if (!hasAnyRole(session, roles)) throw new Response("Forbidden", { status: 403 });
  return session;
}

// Server-fn middleware: rejects unauthenticated requests, injects user context.
export const requireAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const token = readSessionCookie();
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const session = await validateSessionToken(token);
  if (!session) throw new Response("Unauthorized", { status: 401 });
  return next({
    context: {
      userId: session.userId,
      email: session.email,
      displayName: session.displayName,
      role: session.role,
    },
  });
});

export function newId(): string {
  return crypto.randomUUID();
}
