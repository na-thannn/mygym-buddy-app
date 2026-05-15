import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "@/lib/format";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/analyses")({
  head: () => ({ meta: [{ title: "Phân tích AI — HL Fitness" }] }),
  component: AnalysesPage,
});

type Row = { id: string; plan_date: string; content_md: string; created_at: string };

function AnalysesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [f, setF] = useState({ plan_date: new Date().toISOString().slice(0, 10), content_md: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("analyses").select("id, plan_date, content_md, created_at").eq("user_id", user.id).order("plan_date", { ascending: false }).limit(50);
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !f.content_md.trim()) return;
    const { error } = await supabase.from("analyses").insert({ user_id: user.id, plan_date: f.plan_date, content_md: f.content_md });
    if (error) toast.error(error.message);
    else { toast.success("Đã lưu phân tích"); setF({ plan_date: f.plan_date, content_md: "" }); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Xoá phân tích này?")) return;
    await supabase.from("analyses").delete().eq("id", id);
    load();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Phân tích AI" subtitle="So sánh kế hoạch ↔ thực tế tập luyện. AI Coach (qua Copilot Studio) sẽ ghi vào đây." />
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 mb-6 space-y-3">
        <div className="space-y-1"><Label>Ngày kế hoạch</Label>
          <Input type="date" value={f.plan_date} onChange={(e) => setF({ ...f, plan_date: e.target.value })} required /></div>
        <div className="space-y-1"><Label>Nội dung (Markdown)</Label>
          <Textarea rows={6} value={f.content_md} onChange={(e) => setF({ ...f, content_md: e.target.value })} placeholder="# Phân tích..." required /></div>
        <Button type="submit">Lưu phân tích</Button>
      </form>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Chưa có phân tích nào.</div>}
        {rows.map((r) => {
          const isOpen = open === r.id;
          return (
            <div key={r.id} className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between p-3">
                <button className="flex-1 text-left min-w-0" onClick={() => setOpen(isOpen ? null : r.id)}>
                  <div className="font-medium text-sm">Phân tích cho {formatDate(r.plan_date)}</div>
                  <div className="text-xs text-muted-foreground">Lưu lúc {formatDate(r.created_at)}</div>
                </button>
                <Button variant="ghost" size="icon" onClick={() => setOpen(isOpen ? null : r.id)}>
                  {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="size-4" /></Button>
              </div>
              {isOpen && (
                <div className="border-t border-border p-3 prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{r.content_md}</ReactMarkdown>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}