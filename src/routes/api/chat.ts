import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { getSessionUser } from "@/server/auth";
import { getGroq, ALEX_MODEL_ID } from "@/lib/trainer/groq";
import { buildAlexTools } from "@/lib/trainer/tools";
import { parseRequestBody } from "@/lib/request-utils";
import { buildTrainerContext, formatYmd } from "@/lib/trainer/context";
import { buildAlexSystemPrompt } from "@/lib/trainer/prompts";
import { loadChatThread, saveChatMessages } from "@/lib/trainer/chat-store";

type AiTools = NonNullable<Parameters<typeof streamText>[0]["tools"]>;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => handleChatPost(request as unknown as Request),
    },
  },
});

export async function handleChatPost(request: Request) {
  const session = await getSessionUser();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body: unknown = await parseRequestBody(request as unknown);
  const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const threadId = typeof bodyObj["id"] === "string" ? bodyObj["id"] : "";
  const message = bodyObj["message"] as UIMessage | undefined;

  if (!threadId || !message) {
    return json({ error: "Missing chat id or message" }, 400);
  }

  const thread = await loadChatThread({ userId: session.userId, threadId });
  if (!thread) return json({ error: "Chat thread not found" }, 404);

  const tools = buildAlexTools(session.userId);
  const aiTools = tools as unknown as AiTools;
  let validatedMessages: UIMessage[];
  try {
    validatedMessages = await validateUIMessages({
      messages: [...thread.messages, message],
      tools: aiTools,
    });
  } catch {
    return json({ error: "Invalid chat message" }, 400);
  }

  let groq;
  try {
    groq = getGroq();
  } catch {
    return json({ error: "Missing GROQ_API_KEY" }, 400);
  }

  const context = await buildTrainerContext({ userId: session.userId });
  const system = buildAlexSystemPrompt({
    today: formatYmd(new Date()),
    contextText: context.text,
  });

  const result = streamText({
    model: groq(ALEX_MODEL_ID),
    system,
    messages: await convertToModelMessages(validatedMessages),
    tools: aiTools,
    stopWhen: stepCountIs(50),
  });

  void result.consumeStream?.();

  return result.toUIMessageStreamResponse({
    originalMessages: validatedMessages,
    onFinish: async ({ messages }) => {
      await saveChatMessages({ userId: session.userId, threadId, messages });
    },
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
