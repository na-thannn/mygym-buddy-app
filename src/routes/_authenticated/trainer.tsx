import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ChevronDown,
  ChevronRight,
  Headphones,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { getTrainerPromptFromSearch } from "@/lib/customer-experience";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trainer")({
  head: () => ({ meta: [{ title: "AI Coach - HL Fitness" }] }),
  component: TrainerPage,
});

type ThreadSummary = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessagePreview: string | null;
};

type LoadedThread = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
};

const SUGGESTIONS = [
  {
    label: "Set up my profile",
    prompt: "Help me finish my member profile so you can coach me better.",
  },
  {
    label: "Generate a plan",
    prompt: "Build me a 4-day workout plan using my profile and recent progress.",
  },
  {
    label: "Log workout",
    prompt: "Log today's workout with me one exercise at a time.",
  },
  {
    label: "Review meals",
    prompt: "Review my recent nutrition logs and suggest one realistic improvement.",
  },
  {
    label: "Weekly check-in",
    prompt: "Analyze my progress this week and save the coaching feedback.",
  },
];

function TrainerPage() {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [threadsBusy, setThreadsBusy] = useState(true);
  const [threadBusy, setThreadBusy] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportBusy, setSupportBusy] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setInitialPrompt(getTrainerPromptFromSearch(window.location.search));
  }, []);

  const refreshThreads = useCallback(async () => {
    const res = await fetch("/api/chat/threads", { credentials: "include" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error ?? "Unable to load conversations");
    const rows = (body.threads ?? []) as ThreadSummary[];
    setThreads(rows);
    return rows;
  }, []);

  const loadThread = useCallback(async (threadId: string) => {
    setThreadBusy(true);
    try {
      const res = await fetch(`/api/chat/thread?id=${encodeURIComponent(threadId)}`, {
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Unable to load conversation");
      const thread = body.thread as LoadedThread;
      setActiveThreadId(thread.id);
      setInitialMessages(thread.messages ?? []);
    } finally {
      setThreadBusy(false);
    }
  }, []);

  const createThread = useCallback(async () => {
    setThreadBusy(true);
    try {
      const res = await fetch("/api/chat/threads", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "New chat" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Unable to create conversation");
      const thread = body.thread as ThreadSummary;
      setThreads((current) => [thread, ...current.filter((row) => row.id !== thread.id)]);
      setActiveThreadId(thread.id);
      setInitialMessages([]);
      return thread.id;
    } finally {
      setThreadBusy(false);
    }
  }, []);

  const deleteThread = useCallback(
    async (threadId: string) => {
      const res = await fetch(`/api/chat/thread?id=${encodeURIComponent(threadId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Unable to delete conversation");
      const nextThreads = threads.filter((thread) => thread.id !== threadId);
      setThreads(nextThreads);
      if (activeThreadId === threadId) {
        if (nextThreads[0]) {
          await loadThread(nextThreads[0].id);
        } else {
          await createThread();
        }
      }
    },
    [activeThreadId, createThread, loadThread, threads],
  );

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setThreadsBusy(true);
      try {
        const rows = await refreshThreads();
        if (cancelled) return;
        if (rows[0]) {
          await loadThread(rows[0].id);
        } else {
          await createThread();
        }
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Unable to load AI Coach");
      } finally {
        if (!cancelled) setThreadsBusy(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [createThread, loadThread, refreshThreads]);

  const submitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportBusy(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject: supportSubject,
          message: supportMessage,
          source: "ai_chat",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Unable to request support");
      toast.success("Support request sent");
      setSupportSubject("");
      setSupportMessage("");
      setSupportOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to request support");
    } finally {
      setSupportBusy(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-6 flex flex-col min-h-[100dvh]">
      <PageHeader
        title="Chat with AI Coach"
        subtitle="Ask Alex for plans, logs, progress reviews, and the handoff to a real person when needed."
        action={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => setSupportOpen((value) => !value)}
            >
              <Headphones className="mr-2 size-4" />
              Human support
            </Button>
            <Button
              type="button"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                createThread().catch((err) =>
                  toast.error(err instanceof Error ? err.message : "Unable to create conversation"),
                );
              }}
              disabled={threadBusy}
            >
              <Plus className="mr-2 size-4" />
              New chat
            </Button>
          </div>
        }
      />

      {supportOpen && (
        <form
          onSubmit={submitSupport}
          className="mb-3 rounded-2xl border border-white/10 bg-[#111612] p-4"
        >
          <div className="mb-3 rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm leading-6 text-slate-200">
            Use this when a booking, injury concern, membership issue, or coaching decision needs a
            human follow-up.
          </div>
          <div className="grid gap-3 md:grid-cols-[0.8fr,1.2fr,auto] md:items-end">
            <div className="space-y-1">
              <Label>Subject</Label>
              <Input
                value={supportSubject}
                onChange={(e) => setSupportSubject(e.target.value)}
                placeholder="Booking or coaching issue"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <Input
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="What do you need help with?"
                required
              />
            </div>
            <Button
              disabled={supportBusy || !supportSubject.trim() || !supportMessage.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {supportBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
              Send
            </Button>
          </div>
        </form>
      )}

      <div className="grid flex-1 min-h-0 gap-3 md:grid-cols-[17rem,1fr]">
        <aside className="rounded-2xl border border-white/10 bg-[#111612]/95 p-3 md:max-h-[calc(100dvh-9rem)] md:overflow-y-auto">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-100">Conversations</div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => {
                createThread().catch((err) =>
                  toast.error(err instanceof Error ? err.message : "Unable to create conversation"),
                );
              }}
              disabled={threadBusy}
              aria-label="New chat"
            >
              <Plus className="size-4" />
            </Button>
          </div>

          {threadsBusy ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <div className="space-y-2">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => {
                    loadThread(thread.id).catch((err) =>
                      toast.error(
                        err instanceof Error ? err.message : "Unable to load conversation",
                      ),
                    );
                  }}
                  className={cn(
                    "w-full rounded-lg border px-3 py-2 text-left transition",
                    activeThreadId === thread.id
                      ? "border-primary/50 bg-primary/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare className="mt-0.5 size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-100">
                        {thread.title || "New chat"}
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs text-slate-400">
                        {thread.lastMessagePreview || "No messages yet"}
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{thread.messageCount} msg</span>
                        <span>|</span>
                        <span>{formatDate(thread.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="min-h-0">
          {activeThreadId ? (
            <ChatPanel
              key={activeThreadId}
              threadId={activeThreadId}
              initialMessages={initialMessages}
              loading={threadBusy}
              initialPrompt={initialPrompt}
              onConversationChanged={() => {
                refreshThreads().catch(() => {});
              }}
              onDelete={() => {
                deleteThread(activeThreadId)
                  .then(() => toast.success("Conversation deleted"))
                  .catch((err) =>
                    toast.error(
                      err instanceof Error ? err.message : "Unable to delete conversation",
                    ),
                  );
              }}
            />
          ) : (
            <div className="flex h-full min-h-[28rem] items-center justify-center rounded-2xl border border-white/10 bg-[#111612]/95 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading AI Coach...
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ChatPanel({
  threadId,
  initialMessages,
  loading,
  initialPrompt,
  onConversationChanged,
  onDelete,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  loading: boolean;
  initialPrompt: string;
  onConversationChanged: () => void;
  onDelete: () => void;
}) {
  const [input, setInput] = useState(initialPrompt);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest({ messages, id }) {
          return {
            body: {
              id,
              message: messages[messages.length - 1],
            },
          };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onFinish: onConversationChanged,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    taRef.current?.focus();
  }, [status]);

  useEffect(() => {
    if (!initialPrompt || messages.length > 0) return;
    setInput((current) => current || initialPrompt);
  }, [initialPrompt, messages.length]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t) return;
    sendMessage({ text: t });
    setInput("");
  };

  const busy = loading || status === "submitted" || status === "streaming";

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[32rem] flex-col">
      <div className="mb-2 flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-slate-300 hover:text-red-200"
          onClick={onDelete}
          disabled={busy}
        >
          <Trash2 className="mr-2 size-4" />
          Delete chat
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-[#111612]/95 p-3 md:p-4 space-y-4 animate-fade-up"
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-slate-400">
          Alex reads your saved profile, workouts, nutrition, InBody reports, plans, and recent
          analyses when the question needs member context. For pain, injury, bookings, or account
          issues, ask for human support.
        </div>

        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-slate-400">
            <Sparkles className="size-6 mx-auto mb-2 text-primary" />
            <div className="mb-2 text-base font-semibold text-slate-100">
              Start with a coaching task
            </div>
            <div className="mb-4">Pick a prompt or type what you need.</div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => submit(s.prompt)}
                  className="rounded-full bg-primary/10 px-3 py-1.5 text-xs text-primary transition hover:bg-primary/15"
                  disabled={busy}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {(status === "submitted" || loading) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            AI Coach is thinking...
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
          placeholder="Message Alex... (Enter to send, Shift+Enter for new line)"
          rows={2}
          className="resize-none"
          disabled={busy}
        />
        <Button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={!input.trim() || busy}
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
                  ? "bg-primary text-primary-foreground"
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
  const label = getToolLabel(toolName);
  const state = part.state as string;
  const statusLabel: Record<string, string> = {
    "input-streaming": "preparing...",
    "input-available": "calling...",
    "output-available": "done",
    "output-error": "failed",
  };
  return (
    <div className="w-full max-w-[85%] rounded-lg border border-white/10 bg-[#111612] text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        {open ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
        <Wrench className="size-3 text-primary" />
        <span className="font-medium">{label}</span>
        <span className="text-slate-400 ml-auto">{statusLabel[state] ?? state}</span>
      </button>
      {open && (
        <div className="px-3 pb-2 space-y-2 border-t border-white/10 pt-2">
          {part.input !== undefined && (
            <div>
              <div className="text-[10px] uppercase text-slate-400 mb-1">Input</div>
              <pre className="bg-white/[0.05] rounded p-2 overflow-x-auto text-[11px]">
                {JSON.stringify(part.input, null, 2)}
              </pre>
            </div>
          )}
          {part.output !== undefined && (
            <div>
              <div className="text-[10px] uppercase text-slate-400 mb-1">Output</div>
              <pre className="bg-white/[0.05] rounded p-2 overflow-x-auto text-[11px]">
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

function getToolLabel(toolName: string) {
  const labels: Record<string, string> = {
    save_profile: "Updating profile",
    get_profile: "Reading profile",
    generate_workout_plan: "Generating plan",
    log_workout_entry: "Logging workout",
    log_nutrition_report: "Logging nutrition",
    log_progress_report: "Saving progress report",
    get_plan_for_date: "Reading saved plan",
    get_workouts_since: "Reading workouts",
    analyze_progress: "Saving coaching review",
    create_support_ticket: "Creating support ticket",
    get_recent_nutrition: "Reading nutrition logs",
    get_inbody_reports: "Reading InBody reports",
    get_progress_reports: "Reading progress reports",
    get_latest_analysis: "Reading latest review",
  };
  return labels[toolName] ?? toolName.replaceAll("_", " ");
}
