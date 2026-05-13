import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pt")({
  head: () => ({ meta: [{ title: "PT Dashboard — HL Fitness" }] }),
  component: PTPage,
});

type Thread = { id: string; user_id: string; status: string; updated_at: string; assigned_pt_id: string | null; member_name?: string };
type Msg = { id: string; sender_role: string; content: string; created_at: string };

function PTPage() {
  const { user, role } = useAuth();
  const [online, setOnline] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");

  if (role && role !== "pt" && role !== "admin") {
    throw redirect({ to: "/feed" });
  }

  useEffect(() => {
    if (!user) return;
    supabase.from("pt_presence").select("is_online").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setOnline(!!data?.is_online);
    });
  }, [user]);

  const togglePresence = async (v: boolean) => {
    if (!user) return;
    setOnline(v);
    await supabase.from("pt_presence").upsert({ user_id: user.id, is_online: v, last_seen_at: new Date().toISOString() });
  };

  const loadThreads = async () => {
    const { data } = await supabase
      .from("coach_threads")
      .select("id, user_id, status, updated_at, assigned_pt_id")
      .eq("status", "escalated")
      .order("updated_at", { ascending: false });
    if (!data) { setThreads([]); return; }
    const uids = [...new Set(data.map((t) => t.user_id))];
    const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", uids);
    const map = new Map((profs ?? []).map((p) => [p.id, p.display_name]));
    setThreads(data.map((t) => ({ ...t, member_name: map.get(t.user_id) ?? "Thành viên" })));
  };

  useEffect(() => {
    loadThreads();
    const ch = supabase.channel("pt-threads")
      .on("postgres_changes", { event: "*", schema: "public", table: "coach_threads" }, () => loadThreads())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    if (!active) return;
    supabase.from("coach_messages").select("id, sender_role, content, created_at").eq("thread_id", active.id).order("created_at").then(({ data }) => setMsgs((data as Msg[]) ?? []));
    const ch = supabase.channel(`pt-msgs-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "coach_messages", filter: `thread_id=eq.${active.id}` }, (p) => {
        setMsgs((prev) => prev.some((m) => m.id === (p.new as Msg).id) ? prev : [...prev, p.new as Msg]);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active]);

  const claim = async (t: Thread) => {
    if (!user) return;
    await supabase.from("coach_threads").update({ assigned_pt_id: user.id }).eq("id", t.id);
    setActive({ ...t, assigned_pt_id: user.id });
  };

  const send = async () => {
    if (!user || !active || !text.trim()) return;
    const { error } = await supabase.from("coach_messages").insert({
      thread_id: active.id, sender_role: "pt", sender_id: user.id, content: text.trim(),
    });
    if (error) { toast.error(error.message); return; }
    await supabase.from("coach_threads").update({ updated_at: new Date().toISOString() }).eq("id", active.id);
    setText("");
  };

  const close = async () => {
    if (!active) return;
    await supabase.from("coach_threads").update({ status: "ai" }).eq("id", active.id);
    toast.success("Đã đóng yêu cầu");
    setActive(null);
    loadThreads();
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <PageHeader
        title="PT Dashboard"
        subtitle="Yêu cầu hỗ trợ từ thành viên"
        action={
          <div className="flex items-center gap-2 text-sm">
            <span className={online ? "text-green-600 font-medium" : "text-muted-foreground"}>{online ? "Đang online" : "Offline"}</span>
            <Switch checked={online} onCheckedChange={togglePresence} />
          </div>
        }
      />

      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        <div className="rounded-xl border border-border bg-card p-2 max-h-[70vh] overflow-y-auto">
          {threads.length === 0 && <div className="text-sm text-muted-foreground p-4 text-center">Không có yêu cầu nào.</div>}
          {threads.map((t) => (
            <button key={t.id} onClick={() => (t.assigned_pt_id ? setActive(t) : claim(t))}
              className={`w-full text-left rounded-md p-2 hover:bg-accent ${active?.id === t.id ? "bg-accent" : ""}`}>
              <div className="text-sm font-medium">{t.member_name}</div>
              <div className="text-[11px] text-muted-foreground">{relativeTime(t.updated_at)}</div>
              {!t.assigned_pt_id && <div className="text-[10px] text-primary mt-0.5">Bấm để nhận</div>}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card flex flex-col h-[70vh]">
          {!active ? (
            <div className="flex-1 grid place-items-center text-sm text-muted-foreground">Chọn một yêu cầu để xem</div>
          ) : (
            <>
              <div className="border-b border-border p-3 flex items-center justify-between">
                <div className="font-medium text-sm">{active.member_name}</div>
                <Button variant="ghost" size="sm" onClick={close}>Đóng yêu cầu</Button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_role === "pt" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.sender_role === "pt" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <div className="text-[10px] uppercase opacity-70 mb-0.5">
                        {m.sender_role === "user" ? "Thành viên" : m.sender_role === "ai" ? "AI" : "Bạn"}
                      </div>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border p-3 flex gap-2">
                <Input value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Trả lời thành viên…" />
                <Button onClick={send}>Gửi</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}