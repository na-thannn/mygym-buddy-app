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
  head: () => ({ meta: [{ title: "AI Coach — HL Fitness" }] }),
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
        title="Chat with AI Coach"
        subtitle="Your AI trainer for plans, logs, and progress analysis."
      />

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-3 md:p-4 space-y-4 animate-fade-up"
      >
        {messages.length === 0 && (
          <div className="text-center text-sm text-slate-400 py-10">
            <Sparkles className="size-6 mx-auto mb-2 text-yellow-300" />
            <div className="mb-3">Start a conversation with AI Coach.</div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="px-3 py-1.5 rounded-full bg-yellow-400/10 text-yellow-200 text-xs hover:bg-yellow-400/20 transition"
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
            AI Coach is thinking…
          </div>
        )}

        {error && (
          <div className="text-sm text-red-300 border border-red-500/40 rounded p-3 bg-red-500/10">
            {error.message || "Unable to reach AI Coach"}
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
          placeholder="Message AI Coach… (Enter to send, Shift+Enter for new line)"
          rows={2}
          className="resize-none"
          disabled={status === "submitted" || status === "streaming"}
        />
        <Button
          type="submit"
          className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300"
          disabled={!input.trim() || status === "submitted" || status === "streaming"}
        >
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
                "rounded-2xl px-4 py-2.5 max-w-[85%] text-sm animate-fade-up",
                isUser
                  ? "bg-yellow-400 text-yellow-950"
                  : "bg-white/10 text-slate-100 prose prose-sm prose-invert max-w-[85%]",
              )}
            >
              {isUser ? (
                part.text
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
              )}
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

type ToolPartShape = {
  type?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function ToolPart({ part }: { part: ToolPartShape }) {
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
    <div className="w-full max-w-[85%] rounded-lg border border-white/10 bg-black/40 text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <Wrench className="size-3 text-yellow-300" />
        <span className="font-mono font-medium">{toolName}</span>
        <span className="text-slate-400 ml-auto">{statusLabel[state] ?? state}</span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-2 border-t border-white/10 pt-2">
          {part.input !== undefined && (
            <div>
              <div className="text-[10px] uppercase text-slate-400 mb-1">Input</div>
              <pre className="bg-white/5 rounded p-2 overflow-x-auto text-[11px]">
                {JSON.stringify(part.input, null, 2)}
              </pre>
            </div>
          )}
          {part.output !== undefined && (
            <div>
              <div className="text-[10px] uppercase text-slate-400 mb-1">Output</div>
              <pre className="bg-white/5 rounded p-2 overflow-x-auto text-[11px]">
                {JSON.stringify(part.output, null, 2)}
              </pre>
            </div>
          )}
          {part.errorText && <div className="text-red-300 text-[11px]">{part.errorText}</div>}
        </div>
      )}
    </div>
  );
}
