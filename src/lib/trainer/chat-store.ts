import { asc, desc, eq } from "drizzle-orm";
import type { UIMessage } from "ai";
import { db, schema } from "@/server/db";

export type ChatThreadSummary = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessagePreview: string | null;
};

export type LoadedChatThread = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
};

export async function createChatThread({
  userId,
  title = "New chat",
}: {
  userId: string;
  title?: string | null;
}) {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db
    .insert(schema.chatThreads)
    .values({
      id,
      userId,
      title: title?.trim() || "New chat",
      createdAt: now,
      updatedAt: now,
    });
  return { id, title: title?.trim() || "New chat", createdAt: now, updatedAt: now };
}

export async function listChatThreads({
  userId,
}: {
  userId: string;
}): Promise<ChatThreadSummary[]> {
  const threads = await db
    .select()
    .from(schema.chatThreads)
    .where(eq(schema.chatThreads.userId, userId))
    .orderBy(desc(schema.chatThreads.updatedAt), desc(schema.chatThreads.createdAt));

  const summaries = await Promise.all(
    threads.map(async (thread) => {
      const messages = await loadMessagesForThread(thread.id);
      const lastMessage = messages.at(-1);
      return {
        id: thread.id,
        title: thread.title,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        messageCount: messages.length,
        lastMessagePreview: lastMessage ? messagePreview(lastMessage) : null,
      };
    }),
  );
  return summaries;
}

export async function loadChatThread({
  userId,
  threadId,
}: {
  userId: string;
  threadId: string;
}): Promise<LoadedChatThread | null> {
  const [thread] = await db
    .select()
    .from(schema.chatThreads)
    .where(eq(schema.chatThreads.id, threadId))
    .limit(1);
  if (!thread || thread.userId !== userId) return null;
  return {
    id: thread.id,
    title: thread.title,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    messages: await loadMessagesForThread(thread.id),
  };
}

export async function saveChatMessages({
  userId,
  threadId,
  messages,
}: {
  userId: string;
  threadId: string;
  messages: UIMessage[];
}) {
  const [thread] = await db
    .select({
      id: schema.chatThreads.id,
      userId: schema.chatThreads.userId,
      title: schema.chatThreads.title,
    })
    .from(schema.chatThreads)
    .where(eq(schema.chatThreads.id, threadId))
    .limit(1);
  if (!thread || thread.userId !== userId) return false;

  await db.delete(schema.chatMessages).where(eq(schema.chatMessages.threadId, threadId));
  if (messages.length > 0) {
    await db
      .insert(schema.chatMessages)
      .values(
        messages.map((message) => ({
          id: message.id || crypto.randomUUID(),
          threadId,
          role: message.role,
          contentJson: JSON.stringify(message),
          createdAt: new Date().toISOString(),
        })),
      );
  }
  const nextTitle =
    !thread.title || thread.title === "New chat"
      ? titleFromMessages(messages) || thread.title || "New chat"
      : thread.title;
  await db
    .update(schema.chatThreads)
    .set({
      title: nextTitle,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.chatThreads.id, threadId));
  return true;
}

export async function deleteChatThread({ userId, threadId }: { userId: string; threadId: string }) {
  const [thread] = await db
    .select({ id: schema.chatThreads.id, userId: schema.chatThreads.userId })
    .from(schema.chatThreads)
    .where(eq(schema.chatThreads.id, threadId))
    .limit(1);
  if (!thread || thread.userId !== userId) return false;
  await db.delete(schema.chatThreads).where(eq(schema.chatThreads.id, threadId));
  return true;
}

async function loadMessagesForThread(threadId: string): Promise<UIMessage[]> {
  const rows = await db
    .select()
    .from(schema.chatMessages)
    .where(eq(schema.chatMessages.threadId, threadId))
    .orderBy(asc(schema.chatMessages.createdAt));
  return rows
    .map((row) => {
      try {
        return JSON.parse(row.contentJson) as UIMessage;
      } catch {
        return {
          id: row.id,
          role: row.role as UIMessage["role"],
          parts: [{ type: "text" as const, text: "" }],
        };
      }
    })
    .filter((message) => message.parts.length > 0);
}

function titleFromMessages(messages: UIMessage[]) {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return null;
  const preview = messagePreview(firstUser);
  if (!preview) return null;
  return preview.length > 60 ? `${preview.slice(0, 57).trimEnd()}...` : preview;
}

function messagePreview(message: UIMessage) {
  return message.parts
    .map((part) => {
      if (part.type === "text") return part.text;
      if (part.type?.startsWith("tool-")) return `[${part.type.replace(/^tool-/, "")}]`;
      return "";
    })
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
