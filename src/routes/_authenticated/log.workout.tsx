import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { listRecentWorkouts, logWorkoutEntry } from "@/lib/workout.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/log/workout")({
  head: () => ({ meta: [{ title: "Workout Log — HL Fitness" }] }),
  component: WorkoutLog,
});

type Row = Awaited<ReturnType<typeof listRecentWorkouts>>[number];

const today = () => new Date().toISOString().slice(0, 10);

function WorkoutLog() {
  const list = useCallback(async (options?: { limit?: number }) => {
    const q = new URLSearchParams();
    if (options?.limit) q.set("limit", String(options.limit));
    const res = await fetch(`/api/log/workout?${q.toString()}`, { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  }, []);

  const create = async (payload: { data: Record<string, unknown> }) => {
    await fetch("/api/log/workout", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
    });
  };
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
    const data = await list({ limit: 50 });
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
      toast.success("Workout logged");
      setF({ ...f, exercise: "", sets: "", reps: "", weightKg: "", notes: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Workout Log" subtitle="Capture every completed exercise and session." />
      <form
        onSubmit={submit}
        className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 mb-6 space-y-3 animate-fade-up"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={f.performedAt}
              onChange={(e) => setF({ ...f, performedAt: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label>Session</Label>
            <Input
              value={f.dayLabel}
              onChange={(e) => setF({ ...f, dayLabel: e.target.value })}
              placeholder="Day 1, Push, ..."
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Muscle group</Label>
            <Input
              value={f.muscleGroup}
              onChange={(e) => setF({ ...f, muscleGroup: e.target.value })}
              placeholder="Chest, Back..."
            />
          </div>
          <div className="space-y-1">
            <Label>Exercise</Label>
            <Input
              value={f.exercise}
              onChange={(e) => setF({ ...f, exercise: e.target.value })}
              placeholder="Bench Press"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Sets</Label>
            <Input
              type="number"
              value={f.sets}
              onChange={(e) => setF({ ...f, sets: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Reps</Label>
            <Input
              value={f.reps}
              onChange={(e) => setF({ ...f, reps: e.target.value })}
              placeholder="8-12"
            />
          </div>
          <div className="space-y-1">
            <Label>Load (kg)</Label>
            <Input
              type="number"
              step="0.5"
              value={f.weightKg}
              onChange={(e) => setF({ ...f, weightKg: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Notes</Label>
          <Textarea
            rows={2}
            value={f.notes}
            onChange={(e) => setF({ ...f, notes: e.target.value })}
          />
        </div>
        <Button type="submit" className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300">
          Save entry
        </Button>
      </form>

      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="text-sm text-slate-400 text-center py-10">No workouts logged yet.</div>
        )}
        {rows.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/5"
          >
            <div className="font-medium text-sm text-slate-100">{r.exercise}</div>
            <div className="text-xs text-slate-400">
              {formatDate(r.performedAt)}
              {r.muscleGroup ? ` • ${r.muscleGroup}` : ""}
              {r.sets && r.reps ? ` • ${r.sets}×${r.reps}` : ""}
              {r.weightKg ? ` • ${r.weightKg}kg` : ""}
            </div>
            {r.notes && <div className="text-xs mt-1 italic text-slate-300">{r.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
