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
import { Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/progress-report")({
  head: () => ({ meta: [{ title: "Báo cáo tiến độ — HL Fitness" }] }),
  component: ProgressReport,
});

type Row = { id: string; report_date: string; total_sessions: number | null; streak_days: number | null; total_volume: number | null; notes: string | null };

function ProgressReport() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState({ report_date: new Date().toISOString().slice(0, 10), total_sessions: "", streak_days: "", total_volume: "", notes: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("progress_reports").select("*").eq("user_id", user.id).order("report_date", { ascending: false }).limit(60);
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const num = (s: string) => (s ? Number(s) : null);
    const { error } = await supabase.from("progress_reports").insert({
      user_id: user.id,
      report_date: f.report_date,
      total_sessions: num(f.total_sessions) ?? 0,
      streak_days: num(f.streak_days) ?? 0,
      total_volume: num(f.total_volume) ?? 0,
      notes: f.notes || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Đã lưu báo cáo"); setF({ report_date: new Date().toISOString().slice(0, 10), total_sessions: "", streak_days: "", total_volume: "", notes: "" }); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Xoá báo cáo này?")) return;
    await supabase.from("progress_reports").delete().eq("id", id);
    load();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Báo cáo tiến độ" subtitle="Tổng kết theo tuần — đồng bộ định dạng với AI Coach" />
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Ngày báo cáo</Label>
            <Input type="date" value={f.report_date} onChange={(e) => setF({ ...f, report_date: e.target.value })} required /></div>
          <div className="space-y-1"><Label>Số buổi tập trong tuần</Label>
            <Input type="number" value={f.total_sessions} onChange={(e) => setF({ ...f, total_sessions: e.target.value })} /></div>
          <div className="space-y-1"><Label>Streak (ngày liên tiếp)</Label>
            <Input type="number" value={f.streak_days} onChange={(e) => setF({ ...f, streak_days: e.target.value })} /></div>
          <div className="space-y-1"><Label>Tổng volume (kg)</Label>
            <Input type="number" step="0.1" value={f.total_volume} onChange={(e) => setF({ ...f, total_volume: e.target.value })} /></div>
        </div>
        <div className="space-y-1"><Label>Ghi chú</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <Button type="submit">Lưu báo cáo</Button>
      </form>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Chưa có báo cáo.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-3 flex items-start justify-between gap-2">
            <div className="min-w-0 text-sm">
              <div className="font-medium">{formatDate(r.report_date)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {r.total_sessions ?? 0} buổi • streak {r.streak_days ?? 0} ngày • volume {r.total_volume ?? 0} kg
              </div>
              {r.notes && <div className="text-xs mt-1 italic">{r.notes}</div>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}