import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser } from "@/server/auth";
import { deleteChatThread, loadChatThread } from "@/lib/trainer/chat-store";

export const Route = createFileRoute("/api/chat/thread")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        const threadId = new URL(request.url).searchParams.get("id") ?? "";
        if (!threadId) return json({ error: "Missing id" }, 400);
        const thread = await loadChatThread({ userId: session.userId, threadId });
        if (!thread) return json({ error: "Chat thread not found" }, 404);
        return json({ thread });
      },
      DELETE: async ({ request }) => {
        const session = await getSessionUser();
        if (!session) return json({ error: "Unauthorized" }, 401);
        const threadId = new URL(request.url).searchParams.get("id") ?? "";
        if (!threadId) return json({ error: "Missing id" }, 400);
        const deleted = await deleteChatThread({ userId: session.userId, threadId });
        if (!deleted) return json({ error: "Chat thread not found" }, 404);
        return json({ ok: true });
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
