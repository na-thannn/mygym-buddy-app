import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronRight, Loader2, Send, Sparkles, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/trainer")({
  head: () => ({ meta: [{ title: "Alex — AI Trainer" }] }),
  component: TrainerPage,
});

const SUGGESTIONS = [
  "Set up my profile",
  "Build me a 4-day workout plan",
  "Log today's workout",
  "Log what I ate today",
  "Analyze my progress this week",
];

function TrainerPage() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    taRef.current?.focus();
  }, [status]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t) return;
    sendMessage({ text: t });
    setInput("");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 pt-4 pb-6 flex flex-col h-[100dvh] md:h-screen">
      <PageHeader
        title="Chat với Alex"
        subtitle="HLV ảo của bạn — gen kế hoạch, log buổi tập, phân tích tiến độ."
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-3 md:p-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10">
            <Sparkles className="size-6 mx-auto mb-2 text-primary" />
            <div className="mb-3">Bắt đầu trò chuyện với Alex.</div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs hover:bg-accent/80"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {status === "submitted" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Alex is thinking…
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive border border-destructive/50 rounded p-2">
            {error.message || "Lỗi kết nối tới Alex"}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="mt-3 flex gap-2 items-end"
      >
        <Textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          placeholder="Nhắn cho Alex… (Enter để gửi, Shift+Enter xuống dòng)"
          rows={2}
          className="resize-none"
          disabled={status === "submitted" || status === "streaming"}
        />
        <Button type="submit" disabled={!input.trim() || status === "submitted" || status === "streaming"}>
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

type AnyMessage = ReturnType<typeof useChat>["messages"][number];

function MessageBubble({ message }: { message: AnyMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          return (
            <div
              key={i}
              className={cn(
                "rounded-2xl px-4 py-2.5 max-w-[85%] text-sm",
                isUser
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground prose prose-sm dark:prose-invert max-w-[85%]",
              )}
            >
              {isUser ? part.text : <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>}
            </div>
          );
        }
        if (part.type?.startsWith("tool-")) {
          return <ToolPart key={i} part={part} />;
        }
        return null;
      })}
    </div>
  );
}

function ToolPart({ part }: { part: any }) {
  const [open, setOpen] = useState(false);
  const toolName = String(part.type).replace(/^tool-/, "");
  const state = part.state as string;
  const statusLabel: Record<string, string> = {
    "input-streaming": "preparing…",
    "input-available": "calling…",
    "output-available": "done",
    "output-error": "failed",
  };
  return (
    <div className="w-full max-w-[85%] rounded-lg border border-border bg-background/50 text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <Wrench className="size-3 text-primary" />
        <span className="font-mono font-medium">{toolName}</span>
        <span className="text-muted-foreground ml-auto">{statusLabel[state] ?? state}</span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-2 border-t border-border pt-2">
          {part.input !== undefined && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1">Input</div>
              <pre className="bg-muted rounded p-2 overflow-x-auto text-[11px]">
                {JSON.stringify(part.input, null, 2)}
              </pre>
            </div>
          )}
          {part.output !== undefined && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground mb-1">Output</div>
              <pre className="bg-muted rounded p-2 overflow-x-auto text-[11px]">
                {JSON.stringify(part.output, null, 2)}
              </pre>
            </div>
          )}
          {part.errorText && (
            <div className="text-destructive text-[11px]">{part.errorText}</div>
          )}
        </div>
      )}
    </div>
  );
}
