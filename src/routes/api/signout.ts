import { createFileRoute } from "@tanstack/react-router";
import { readSessionCookie, invalidateSessionToken, clearSessionCookie } from "@/server/auth";

export const Route = createFileRoute("/api/signout")({
  server: {
    handlers: {
      POST: async () => {
        const token = readSessionCookie();
        if (token) await invalidateSessionToken(token);
        clearSessionCookie();
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
