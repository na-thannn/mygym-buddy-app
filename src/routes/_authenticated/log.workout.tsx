import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listRecentWorkouts, logWorkoutEntry } from "@/lib/workout.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/log/workout")({
  head: () => ({ meta: [{ title: "Nhật ký tập — HL Fitness" }] }),
  component: WorkoutLog,
});

type Row = Awaited<ReturnType<typeof listRecentWorkouts>>[number];

const today = () => new Date().toISOString().slice(0, 10);

function WorkoutLog() {
  const list = useServerFn(listRecentWorkouts);
  const create = useServerFn(logWorkoutEntry);
  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState({
    performedAt: today(),
    dayLabel: "",
    muscleGroup: "",
    exercise: "",
    sets: "",
    reps: "",
    weightKg: "",
    notes: "",
  });

  const load = useCallback(async () => {
    const data = await list({ data: { limit: 50 } });
    setRows(data);
  }, [list]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.exercise.trim()) return;
    const num = (s: string) => (s ? Number(s) : null);
    try {
      await create({
        data: {
          performedAt: f.performedAt,
          dayLabel: f.dayLabel || null,
          muscleGroup: f.muscleGroup || null,
          exercise: f.exercise.trim(),
          sets: num(f.sets) as number | null,
          reps: f.reps || null,
          weightKg: num(f.weightKg),
          notes: f.notes || null,
        },
      });
      toast.success("Đã log bài tập");
      setF({ ...f, exercise: "", sets: "", reps: "", weightKg: "", notes: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Nhật ký tập" subtitle="Ghi lại từng bài tập đã hoàn thành" />
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Ngày</Label>
            <Input type="date" value={f.performedAt} onChange={(e) => setF({ ...f, performedAt: e.target.value })} required /></div>
          <div className="space-y-1"><Label>Buổi tập</Label>
            <Input value={f.dayLabel} onChange={(e) => setF({ ...f, dayLabel: e.target.value })} placeholder="Day 1, Push, ..." /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Nhóm cơ</Label>
            <Input value={f.muscleGroup} onChange={(e) => setF({ ...f, muscleGroup: e.target.value })} placeholder="Chest, Back..." /></div>
          <div className="space-y-1"><Label>Bài tập</Label>
            <Input value={f.exercise} onChange={(e) => setF({ ...f, exercise: e.target.value })} placeholder="Bench Press" required /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1"><Label>Sets</Label><Input type="number" value={f.sets} onChange={(e) => setF({ ...f, sets: e.target.value })} /></div>
          <div className="space-y-1"><Label>Reps</Label><Input value={f.reps} onChange={(e) => setF({ ...f, reps: e.target.value })} placeholder="8-12" /></div>
          <div className="space-y-1"><Label>Tạ (kg)</Label><Input type="number" step="0.5" value={f.weightKg} onChange={(e) => setF({ ...f, weightKg: e.target.value })} /></div>
        </div>
        <div className="space-y-1"><Label>Ghi chú</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <Button type="submit">Lưu</Button>
      </form>

      <div className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Chưa có bài tập nào.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-3">
            <div className="font-medium text-sm">{r.exercise}</div>
            <div className="text-xs text-muted-foreground">
              {formatDate(r.performedAt)}
              {r.muscleGroup ? ` • ${r.muscleGroup}` : ""}
              {r.sets && r.reps ? ` • ${r.sets}×${r.reps}` : ""}
              {r.weightKg ? ` • ${r.weightKg}kg` : ""}
            </div>
            {r.notes && <div className="text-xs mt-1 italic">{r.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
