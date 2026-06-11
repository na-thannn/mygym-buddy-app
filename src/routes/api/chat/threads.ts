import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser } from "@/server/auth";
import { parseRequestBody } from "@/lib/request-utils";
import { createChatThread, listChatThreads } from "@/lib/trainer/chat-store";

export const Route = createFileRoute("/api/chat/threads")({
  server: {
    handlers: {
      GET: async () => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        const threads = await listChatThreads({ userId: session.userId });
        return json({ threads });
      },
      POST: async ({ request }) => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        const body: unknown = await parseRequestBody(request as unknown);
        const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
        const title = typeof bodyObj["title"] === "string" ? bodyObj["title"] : undefined;
        const thread = await createChatThread({ userId: session.userId, title });
        return json({ thread }, 201);
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
