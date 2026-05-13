import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { coachReply } from "@/lib/coach.functions";
import ReactMarkdown from "react-markdown";
import { Loader2, AlertTriangle, Sparkles, UserCog } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({ meta: [{ title: "AI Coach — HL Fitness" }] }),
  component: CoachPage,
});

type Msg = { id: string; sender_role: "user" | "ai" | "pt"; content: string; created_at: string };
type Thread = { id: string; status: string; assigned_pt_id: string | null };

function CoachPage() {
  const { user } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const reply = useServerFn(coachReply);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Get-or-create active thread
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: existing } = await supabase
        .from("coach_threads")
        .select("id, status, assigned_pt_id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        setThread(existing as Thread);
      } else {
        const { data: created } = await supabase
          .from("coach_threads")
          .insert({ user_id: user.id, title: "AI Coach" })
          .select("id, status, assigned_pt_id")
          .single();
        if (created) setThread(created as Thread);
      }
    })();
  }, [user]);

  // Load + subscribe to messages
  useEffect(() => {
    if (!thread) return;
    (async () => {
      const { data } = await supabase
        .from("coach_messages")
        .select("id, sender_role, content, created_at")
        .eq("thread_id", thread.id)
        .order("created_at");
      setMessages((data as Msg[]) ?? []);
    })();
    const ch = supabase
      .channel(`coach-${thread.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "coach_messages", filter: `thread_id=eq.${thread.id}` }, (p) => {
        setMessages((prev) => prev.some((m) => m.id === (p.new as Msg).id) ? prev : [...prev, p.new as Msg]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "coach_threads", filter: `id=eq.${thread.id}` }, (p) => {
        setThread(p.new as Thread);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [thread]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!thread || !input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      await reply({ data: { threadId: thread.id, message: text } });
    } catch (e) {
      toast.error("Gửi tin nhắn thất bại");
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const escalate = async () => {
    if (!thread) return;
    const { error } = await supabase
      .from("coach_threads")
      .update({ status: "escalated", escalated_at: new Date().toISOString() })
      .eq("id", thread.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("coach_messages").insert({
      thread_id: thread.id, sender_role: "ai",
      content: "Đã chuyển cuộc trò chuyện cho HLV. Một PT sẽ phản hồi sớm nhất có thể.",
    });
    toast.success("Đã chuyển cho HLV");
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 flex flex-col h-[calc(100vh-5rem)] md:h-[calc(100vh-3rem)]">
      <PageHeader
        title="AI Coach"
        subtitle={thread?.status === "escalated" ? "Đang chờ HLV phản hồi" : "Hỏi đáp tập luyện & dinh dưỡng"}
        action={
          thread?.status !== "escalated" && (
            <Button variant="outline" size="sm" onClick={escalate}>
              <UserCog className="size-4 mr-1.5" /> Nhờ PT hỗ trợ
            </Button>
          )
        }
      />

      <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 space-y-3 mb-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">
            <Sparkles className="size-6 mx-auto mb-2 text-primary" />
            Chào bạn! Hỏi mình bất cứ điều gì về tập luyện, dinh dưỡng hay nhờ mình lên kế hoạch tập tuần này nhé.
          </div>
        )}
        {messages.map((m) => <Bubble key={m.id} m={m} mine={m.sender_role === "user"} />)}
        {sending && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="size-3 animate-spin" /> AI đang suy nghĩ…</div>}
        {thread?.status === "escalated" && (
          <div className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md p-2 flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <div>Cuộc trò chuyện đang chờ HLV. Tin nhắn của bạn sẽ được gửi tới PT, không phải AI.</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Nhập tin nhắn… (Enter để gửi)"
          rows={2}
          className="resize-none"
        />
        <Button onClick={send} disabled={sending || !input.trim()}>Gửi</Button>
      </div>
    </div>
  );
}

function Bubble({ m, mine }: { m: Msg; mine: boolean }) {
  const label = m.sender_role === "ai" ? "AI Coach" : m.sender_role === "pt" ? "HLV" : "Bạn";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
        {!mine && <div className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">{label}</div>}
        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1">
          <ReactMarkdown>{m.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}