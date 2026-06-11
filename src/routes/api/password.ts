import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { parseRequestBody } from "@/lib/request-utils";
import { db, schema } from "@/server/db";
import { getSessionUser, hashPassword, verifyPassword } from "@/server/auth";

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(6).max(128),
});

export const Route = createFileRoute("/api/password")({
  server: {
    handlers: {
      PATCH: async (ctx: unknown) => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        const maybe = ctx as unknown as { request?: Request } & Record<string, unknown>;
        const request = maybe.request ?? (ctx as unknown as Request);
        const body = await parseRequestBody(request as unknown);
        const parsed = updatePasswordSchema.safeParse(body);
        if (!parsed.success) return json({ error: "Invalid input", details: parsed.error }, 400);

        const [user] = await db
          .select({ passwordHash: schema.users.passwordHash })
          .from(schema.users)
          .where(eq(schema.users.id, session.userId))
          .limit(1);
        if (!user || !verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
          return json({ error: "Current password is incorrect" }, 400);
        }

        await db
          .update(schema.users)
          .set({
            passwordHash: hashPassword(parsed.data.newPassword),
            mustChangePassword: 0,
          })
          .where(eq(schema.users.id, session.userId));
        return json({ ok: true });
      },
    },
  },
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
