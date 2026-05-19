import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listProgressReports, saveProgressReport } from "@/lib/progress.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/progress-report")({
  head: () => ({ meta: [{ title: "Báo cáo tiến độ — HL Fitness" }] }),
  component: ProgressReport,
});

type Row = Awaited<ReturnType<typeof listProgressReports>>[number];

function ProgressReport() {
  const list = useServerFn(listProgressReports);
  const save = useServerFn(saveProgressReport);
  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState({ reportDate: new Date().toISOString().slice(0, 10), totalSessions: "", streakDays: "", totalVolume: "", notes: "" });

  const load = useCallback(async () => setRows(await list()), [list]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save({
        data: {
          reportDate: f.reportDate,
          totalSessions: Number(f.totalSessions) || 0,
          streakDays: Number(f.streakDays) || 0,
          totalVolume: Number(f.totalVolume) || 0,
          notes: f.notes || null,
        },
      });
      toast.success("Đã lưu báo cáo");
      setF({ ...f, totalSessions: "", streakDays: "", totalVolume: "", notes: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Báo cáo tiến độ" subtitle="Tổng kết tuần" />
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Ngày</Label>
            <Input type="date" value={f.reportDate} onChange={(e) => setF({ ...f, reportDate: e.target.value })} required /></div>
          <div className="space-y-1"><Label>Buổi/tuần</Label>
            <Input type="number" value={f.totalSessions} onChange={(e) => setF({ ...f, totalSessions: e.target.value })} /></div>
          <div className="space-y-1"><Label>Streak (ngày)</Label>
            <Input type="number" value={f.streakDays} onChange={(e) => setF({ ...f, streakDays: e.target.value })} /></div>
          <div className="space-y-1"><Label>Tổng volume (kg)</Label>
            <Input type="number" step="0.1" value={f.totalVolume} onChange={(e) => setF({ ...f, totalVolume: e.target.value })} /></div>
        </div>
        <div className="space-y-1"><Label>Ghi chú</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <Button type="submit">Lưu báo cáo</Button>
      </form>

      <div className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Chưa có báo cáo.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="font-medium">{formatDate(r.reportDate)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {r.totalSessions ?? 0} buổi • streak {r.streakDays ?? 0} ngày • volume {r.totalVolume ?? 0} kg
            </div>
            {r.notes && <div className="text-xs mt-1 italic">{r.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
