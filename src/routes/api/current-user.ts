import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser } from "@/server/auth";

export const Route = createFileRoute("/api/current-user")({
  server: {
    handlers: {
      GET: async () => {
        const session = getSessionUser();
        if (!session) return new Response(null, { status: 204 });
        return new Response(
          JSON.stringify({
            id: session.userId,
            email: session.email,
            displayName: session.displayName,
            role: session.role,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      },
    },
  },
});
