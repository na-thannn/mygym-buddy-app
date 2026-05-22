import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { listProgressReports, saveProgressReport } from "@/lib/progress.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/progress-report")({
  head: () => ({ meta: [{ title: "Progress Report — HL Fitness" }] }),
  component: ProgressReport,
});

type Row = Awaited<ReturnType<typeof listProgressReports>>[number];

function ProgressReport() {
  const list = async () => {
    const res = await fetch('/api/progress-report', { credentials: 'include' });
    if (!res.ok) return [];
    return res.json();
  };

  const save = async (payload: { data: any }) => {
    const res = await fetch('/api/progress-report', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload.data) });
    return res.json();
  };
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
      toast.success("Report saved");
      setF({ ...f, totalSessions: "", streakDays: "", totalVolume: "", notes: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Progress Report" subtitle="Weekly summary of your training volume." />
      <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 mb-6 space-y-3 animate-fade-up">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Date</Label>
            <Input type="date" value={f.reportDate} onChange={(e) => setF({ ...f, reportDate: e.target.value })} required /></div>
          <div className="space-y-1"><Label>Sessions / week</Label>
            <Input type="number" value={f.totalSessions} onChange={(e) => setF({ ...f, totalSessions: e.target.value })} /></div>
          <div className="space-y-1"><Label>Streak (days)</Label>
            <Input type="number" value={f.streakDays} onChange={(e) => setF({ ...f, streakDays: e.target.value })} /></div>
          <div className="space-y-1"><Label>Total volume (kg)</Label>
            <Input type="number" step="0.1" value={f.totalVolume} onChange={(e) => setF({ ...f, totalVolume: e.target.value })} /></div>
        </div>
        <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <Button type="submit" className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300">Save report</Button>
      </form>

      <div className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-slate-400 text-center py-10">No reports yet.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/5">
            <div className="font-medium text-slate-100">{formatDate(r.reportDate)}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {r.totalSessions ?? 0} sessions • streak {r.streakDays ?? 0} days • volume {r.totalVolume ?? 0} kg
            </div>
            {r.notes && <div className="text-xs mt-1 italic text-slate-300">{r.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
