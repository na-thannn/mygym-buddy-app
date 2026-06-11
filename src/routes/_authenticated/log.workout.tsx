import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listRecentWorkouts, logWorkoutEntry } from "@/lib/workout.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { buildWorkoutQuickActions, type WorkoutQuickPatch } from "@/lib/customer-experience";
import { Dumbbell, RefreshCw, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/log/workout")({
  head: () => ({ meta: [{ title: "Workout Log - HL Fitness" }] }),
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

  const quickActions = useMemo(() => buildWorkoutQuickActions(rows), [rows]);

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

  const applyQuickPatch = (patch: WorkoutQuickPatch) => {
    setF((current) => ({
      ...current,
      ...patch,
      performedAt: current.performedAt || today(),
    }));
  };

  return (
    <div className="mx-auto max-w-3xl p-4 pb-24 md:p-6">
      <PageHeader title="Workout Log" subtitle="Capture every completed exercise and session." />
      <form
        onSubmit={submit}
        className="rounded-2xl border border-white/10 bg-[#111612]/95 p-4 mb-6 space-y-3 animate-fade-up"
      >
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Dumbbell className="size-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-100">Fast floor logging</div>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Start from a recent exercise, adjust the numbers, and save the set while it is fresh.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#080b0a]/45 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                <Sparkles className="size-4 text-primary" />
                Quick start
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Recent exercises appear here after you log them.
              </p>
            </div>
            {quickActions.repeatLatest && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.08]"
                onClick={() => applyQuickPatch(quickActions.repeatLatest!.patch)}
              >
                <RefreshCw className="mr-2 size-4" />
                {quickActions.repeatLatest.label}
              </Button>
            )}
          </div>
          {quickActions.recentExercises.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {quickActions.recentExercises.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => applyQuickPatch(action.patch)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-3 text-xs text-slate-500">
              Log your first exercise and this panel will become a shortcut list.
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
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
        <div className="grid gap-3 sm:grid-cols-2">
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
        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
        >
          Save entry
        </Button>
      </form>

      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Dumbbell className="size-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-100">No workouts logged yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
              Save your first exercise above. After that, quick-start buttons will help you repeat
              common lifts faster.
            </p>
          </div>
        )}
        {rows.map((r) => (
          <div
            key={r.id}
            className="rounded-2xl border border-white/10 bg-[#111612]/95 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.05]"
          >
            <div className="font-medium text-sm text-slate-100">{r.exercise}</div>
            <div className="text-xs text-slate-400">
              {formatDate(r.performedAt)}
              {r.muscleGroup ? ` | ${r.muscleGroup}` : ""}
              {r.sets && r.reps ? ` | ${r.sets}x${r.reps}` : ""}
              {r.weightKg ? ` | ${r.weightKg}kg` : ""}
            </div>
            {r.notes && <div className="text-xs mt-1 italic text-slate-300">{r.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
