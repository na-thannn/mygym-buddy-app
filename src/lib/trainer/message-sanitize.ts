import type { UIMessage } from "ai";

export const ALEX_TOOL_NAMES = [
  "save_profile",
  "get_profile",
  "get_gym_knowledge",
  "create_package_request",
  "request_pt_session",
  "book_group_class",
  "cancel_group_class_booking",
  "generate_workout_plan",
  "log_workout_entry",
  "log_nutrition_report",
  "log_progress_report",
  "get_plan_for_date",
  "get_workouts_since",
  "analyze_progress",
  "create_support_ticket",
  "get_recent_nutrition",
  "get_inbody_reports",
  "get_progress_reports",
  "get_latest_analysis",
] as const;

const toolNamePattern = ALEX_TOOL_NAMES.join("|");

const bracketedToolCall = new RegExp(`\\[(${toolNamePattern})\\](?:\\s*\\{[\\s\\S]*?\\})?`, "gi");
const taggedToolCallStart = new RegExp(`<function>(${toolNamePattern})</function>`, "gi");

export function stripLeakedToolSyntax(text: string): string {
  let cleaned = text.replace(bracketedToolCall, "");
  cleaned = stripTaggedToolCalls(cleaned);
  return cleaned.replace(/\s{2,}/g, " ").trim();
}

function stripTaggedToolCalls(text: string): string {
  let result = text;
  let match: RegExpExecArray | null;
  const pattern = new RegExp(taggedToolCallStart.source, "gi");

  while ((match = pattern.exec(result)) !== null) {
    const start = match.index;
    const afterTag = start + match[0].length;
    let end = afterTag;
    if (result[afterTag] === "{") {
      const jsonLength = consumeBalancedJson(result.slice(afterTag));
      if (jsonLength > 0) end = afterTag + jsonLength;
    }
    result = result.slice(0, start) + result.slice(end);
    pattern.lastIndex = start;
  }

  return result;
}

function consumeBalancedJson(text: string): number {
  if (!text.startsWith("{")) return 0;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }

  return text.length;
}

export function sanitizeAssistantMessage(message: UIMessage): UIMessage {
  if (message.role !== "assistant" || !message.parts?.length) return message;

  const parts = message.parts
    .map((part) => {
      if (part.type !== "text") return part;
      const text = stripLeakedToolSyntax(part.text ?? "");
      if (!text) return null;
      return { ...part, text };
    })
    .filter((part): part is NonNullable<typeof part> => part !== null);

  return parts.length > 0 ? { ...message, parts } : { ...message, parts: [] };
}

export function sanitizeChatMessages(messages: UIMessage[]): UIMessage[] {
  return messages
    .map((message) => (message.role === "assistant" ? sanitizeAssistantMessage(message) : message))
    .filter((message) => message.parts.length > 0);
}
