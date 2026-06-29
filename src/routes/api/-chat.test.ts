import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const previousMessages: UIMessage[] = [
  {
    id: "prev-user",
    role: "user",
    parts: [{ type: "text", text: "Remember I want strength." }],
  },
  {
    id: "prev-assistant",
    role: "assistant",
    parts: [{ type: "text", text: "I will keep your strength goal in mind." }],
  },
];

const latestMessage: UIMessage = {
  id: "latest-user",
  role: "user",
  parts: [{ type: "text", text: "What should I train today?" }],
};

const finalMessages: UIMessage[] = [
  ...previousMessages,
  latestMessage,
  {
    id: "assistant-final",
    role: "assistant",
    parts: [{ type: "text", text: "Use today's plan and keep shoulder work controlled." }],
  },
];

const authMock = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
}));

const chatStoreMock = vi.hoisted(() => ({
  loadChatThread: vi.fn(),
  saveChatMessages: vi.fn(),
}));

const contextMock = vi.hoisted(() => ({
  buildTrainerContext: vi.fn(),
  formatYmd: vi.fn(),
}));

const promptMock = vi.hoisted(() => ({
  buildAlexSystemPrompt: vi.fn(),
}));

const toolsMock = vi.hoisted(() => ({
  buildAlexTools: vi.fn(),
}));

const providerMock = vi.hoisted(() => ({
  getModelProvider: vi.fn(),
  isAiConfigured: vi.fn(),
}));

const aiMock = vi.hoisted(() => ({
  convertToModelMessages: vi.fn(),
  stepCountIs: vi.fn(),
  streamText: vi.fn(),
  validateUIMessages: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => config,
}));

vi.mock("@/server/auth", () => authMock);
vi.mock("@/lib/trainer/chat-store", () => chatStoreMock);
vi.mock("@/lib/trainer/context", () => contextMock);
vi.mock("@/lib/trainer/prompts", () => promptMock);
vi.mock("@/lib/trainer/tools", () => toolsMock);
vi.mock("@/lib/trainer/groq", () => ({
  ...providerMock,
  ALEX_MODEL_ID: "test-chat-model",
  AI_NOT_CONFIGURED_MESSAGE: "AI provider is not configured.",
}));
vi.mock("ai", () => aiMock);

describe("chat API handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.getSessionUser.mockReturnValue({
      userId: "user-1",
      email: "member@example.com",
      displayName: "Member",
      role: "customer",
      mustChangePassword: false,
    });
    chatStoreMock.loadChatThread.mockResolvedValue({
      id: "thread-1",
      title: "Strength chat",
      messages: previousMessages,
    });
    chatStoreMock.saveChatMessages.mockResolvedValue(undefined);
    contextMock.buildTrainerContext.mockResolvedValue({
      days: 14,
      text: "Member context:\n- Goal: Build strength",
    });
    contextMock.formatYmd.mockReturnValue("2026-06-04");
    promptMock.buildAlexSystemPrompt.mockReturnValue(
      "Alex prompt\nMember context:\n- Goal: Build strength",
    );
    toolsMock.buildAlexTools.mockReturnValue({});
    providerMock.isAiConfigured.mockReturnValue(true);
    providerMock.getModelProvider.mockReturnValue((modelId: string) => ({ modelId }));
    aiMock.validateUIMessages.mockResolvedValue([...previousMessages, latestMessage]);
    aiMock.convertToModelMessages.mockResolvedValue("model messages");
    aiMock.stepCountIs.mockReturnValue("stop condition");
    aiMock.streamText.mockReturnValue({
      consumeStream: vi.fn(),
      toUIMessageStreamResponse: vi.fn(
        (options: { onFinish: (result: { messages: UIMessage[] }) => void }) => {
          options.onFinish({ messages: finalMessages });
          return new Response("stream");
        },
      ),
    });
  });

  it("rejects unauthenticated chat requests", async () => {
    authMock.getSessionUser.mockReturnValue(null);
    const { handleChatPost } = await import("./chat");

    const response = await handleChatPost(
      new Request("http://local.test/api/chat", {
        method: "POST",
        body: JSON.stringify({ id: "thread-1", message: latestMessage }),
      }),
    );

    expect(response.status).toBe(401);
    expect(aiMock.streamText).not.toHaveBeenCalled();
  });

  it("loads saved history, appends the latest message, injects context, and saves the finished stream", async () => {
    const { handleChatPost } = await import("./chat");

    const response = await handleChatPost(
      new Request("http://local.test/api/chat", {
        method: "POST",
        body: JSON.stringify({ id: "thread-1", message: latestMessage }),
      }),
    );

    expect(response.status).toBe(200);
    expect(chatStoreMock.loadChatThread).toHaveBeenCalledWith({
      userId: "user-1",
      threadId: "thread-1",
    });
    expect(aiMock.validateUIMessages).toHaveBeenCalledWith({
      messages: [...previousMessages, latestMessage],
      tools: {},
    });
    expect(toolsMock.buildAlexTools).toHaveBeenCalledWith({
      userId: "user-1",
      role: "customer",
    });
    expect(promptMock.buildAlexSystemPrompt).toHaveBeenCalledWith({
      today: "2026-06-04",
      contextText: "Member context:\n- Goal: Build strength",
    });
    expect(aiMock.streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { modelId: "test-chat-model" },
        system: expect.stringContaining("Goal: Build strength"),
        messages: "model messages",
        tools: {},
        stopWhen: "stop condition",
      }),
    );
    expect(chatStoreMock.saveChatMessages).toHaveBeenCalledWith({
      userId: "user-1",
      threadId: "thread-1",
      messages: finalMessages,
    });
  });
});
