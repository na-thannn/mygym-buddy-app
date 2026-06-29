import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listRecentWorkouts } from "@/lib/workout.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { buildWorkoutQuickActions, type WorkoutQuickPatch } from "@/lib/customer-experience";
import { Dumbbell, Pencil, RefreshCw, Sparkles, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/log/workout")({
  head: () => ({ meta: [{ title: "Workout Log - HL Fitness" }] }),
  component: WorkoutLog,
});

type Row = Awaited<ReturnType<typeof listRecentWorkouts>>[number];

type FormState = {
  performedAt: string;
  dayLabel: string;
  muscleGroup: string;
  exercise: string;
  sets: string;
  reps: string;
  weightKg: string;
  notes: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM: FormState = {
  performedAt: today(),
  dayLabel: "",
  muscleGroup: "",
  exercise: "",
  sets: "",
  reps: "",
  weightKg: "",
  notes: "",
};

function rowToForm(row: Row): FormState {
  return {
    performedAt: row.performedAt,
    dayLabel: row.dayLabel ?? "",
    muscleGroup: row.muscleGroup ?? "",
    exercise: row.exercise,
    sets: row.sets != null ? String(row.sets) : "",
    reps: row.reps ?? "",
    weightKg: row.weightKg != null ? String(row.weightKg) : "",
    notes: row.notes ?? "",
  };
}

function WorkoutLog() {
  const list = useCallback(async (options?: { limit?: number }) => {
    const q = new URLSearchParams();
    if (options?.limit) q.set("limit", String(options.limit));
    const res = await fetch(`/api/log/workout?${q.toString()}`, { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  }, []);

  const create = async (payload: { data: Record<string, unknown> }) => {
    const res = await fetch("/api/log/workout", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Save failed");
    }
  };

  const update = async (payload: { data: Record<string, unknown> }) => {
    const res = await fetch("/api/log/workout", {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Update failed");
    }
  };

  const remove = async (id: string) => {
    const res = await fetch("/api/log/workout", {
      method: "DELETE",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Delete failed");
    }
  };

  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState<FormState>(EMPTY_FORM);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [deleteRow, setDeleteRow] = useState<Row | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await list({ limit: 50 });
    setRows(data);
  }, [list]);

  const quickActions = useMemo(() => buildWorkoutQuickActions(rows), [rows]);

  useEffect(() => {
    load();
  }, [load]);

  const num = (s: string) => (s ? Number(s) : null);

  const formToPayload = (form: FormState) => ({
    performedAt: form.performedAt,
    dayLabel: form.dayLabel || null,
    muscleGroup: form.muscleGroup || null,
    exercise: form.exercise.trim(),
    sets: num(form.sets) as number | null,
    reps: form.reps || null,
    weightKg: num(form.weightKg),
    notes: form.notes || null,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.exercise.trim()) return;
    try {
      await create({ data: formToPayload(f) });
      toast.success("Workout logged");
      setF({ ...f, exercise: "", sets: "", reps: "", weightKg: "", notes: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const openEdit = (row: Row) => {
    setEditRow(row);
    setEditForm(rowToForm(row));
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow || !editForm.exercise.trim()) return;
    setEditBusy(true);
    try {
      await update({ data: { id: editRow.id, ...formToPayload(editForm) } });
      toast.success("Workout updated");
      setEditRow(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setEditBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    setDeleteBusy(true);
    try {
      await remove(deleteRow.id);
      toast.success("Workout deleted");
      setDeleteRow(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteBusy(false);
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
                className="rounded-xl border-white/15 bg-white/[0.05] text-slate-100 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
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

        <WorkoutFields f={f} setF={setF} />
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
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-slate-100">{r.exercise}</div>
                <div className="text-xs text-slate-400">
                  {formatDate(r.performedAt)}
                  {r.muscleGroup ? ` | ${r.muscleGroup}` : ""}
                  {r.sets && r.reps ? ` | ${r.sets}x${r.reps}` : ""}
                  {r.weightKg ? ` | ${r.weightKg}kg` : ""}
                </div>
                {r.notes && <div className="text-xs mt-1 italic text-slate-300">{r.notes}</div>}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-slate-200"
                  aria-label="Edit workout"
                  onClick={() => openEdit(r)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-destructive"
                  aria-label="Delete workout"
                  onClick={() => setDeleteRow(r)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editRow} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent className="max-w-lg border-white/10 bg-[#111612] text-slate-100">
          <DialogHeader>
            <DialogTitle>Edit workout entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="space-y-3">
            <WorkoutFields f={editForm} setF={setEditForm} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editBusy}>
                {editBusy ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRow} onOpenChange={(open) => !open && setDeleteRow(null)}>
        <AlertDialogContent className="border-white/10 bg-[#111612] text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workout entry?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {deleteRow
                ? `This will permanently remove ${deleteRow.exercise} from your log.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteBusy}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBusy ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WorkoutFields({
  f,
  setF,
}: {
  f: FormState;
  setF: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <>
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
    </>
  );
}
