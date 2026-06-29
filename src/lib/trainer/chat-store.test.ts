import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCleanDatabase } from "@/test/use-clean-database";

useCleanDatabase();

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.resetModules();
});

async function seedUsers() {
  const { db, schema } = await import("@/server/db");
  await db
    .insert(schema.users)
    .values([
      {
        id: "user-1",
        email: "one@example.com",
        passwordHash: "hash",
        displayName: "User One",
      },
      {
        id: "user-2",
        email: "two@example.com",
        passwordHash: "hash",
        displayName: "User Two",
      },
    ]);
}

const messages: UIMessage[] = [
  {
    id: "msg-1",
    role: "user",
    parts: [{ type: "text", text: "Help me plan bench day" }],
  },
  {
    id: "msg-2",
    role: "assistant",
    parts: [{ type: "text", text: "Let's use your shoulder limitation as a guardrail." }],
  },
];

describe("chat store", () => {
  it("creates, saves, loads, lists, and deletes user-scoped threads", async () => {
    await seedUsers();
    const {
      createChatThread,
      deleteChatThread,
      listChatThreads,
      loadChatThread,
      saveChatMessages,
    } = await import("./chat-store");

    const thread = await createChatThread({ userId: "user-1", title: "Bench setup" });
    await saveChatMessages({ userId: "user-1", threadId: thread.id, messages });

    const loaded = await loadChatThread({ userId: "user-1", threadId: thread.id });
    expect(loaded?.title).toBe("Bench setup");
    expect(loaded?.messages).toEqual(messages);

    const blocked = await loadChatThread({ userId: "user-2", threadId: thread.id });
    expect(blocked).toBeNull();

    const summaries = await listChatThreads({ userId: "user-1" });
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      id: thread.id,
      title: "Bench setup",
      messageCount: 2,
    });
    expect(summaries[0]?.lastMessagePreview).toContain("shoulder limitation");

    const deniedDelete = await deleteChatThread({ userId: "user-2", threadId: thread.id });
    expect(deniedDelete).toBe(false);
    expect(await loadChatThread({ userId: "user-1", threadId: thread.id })).not.toBeNull();

    const deleted = await deleteChatThread({ userId: "user-1", threadId: thread.id });
    expect(deleted).toBe(true);
    expect(await loadChatThread({ userId: "user-1", threadId: thread.id })).toBeNull();
  });
});
