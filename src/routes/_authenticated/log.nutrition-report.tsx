import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { listNutritionReports, saveNutritionReport } from "@/lib/nutrition.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/log/nutrition-report")({
  head: () => ({ meta: [{ title: "Nutrition Report — HL Fitness" }] }),
  component: NutritionReport,
});

type Row = Awaited<ReturnType<typeof listNutritionReports>>[number];
type DayType = "Workout day" | "Rest day" | "Cheat day";

const empty = {
  reportDate: new Date().toISOString().slice(0, 10),
  dayType: "Workout day" as DayType,
  breakfast: "",
  lunch: "",
  dinner: "",
  snacks: "",
  preWorkoutMeal: "",
  postWorkoutMeal: "",
  notes: "",
};

function NutritionReport() {
  const list = async () => {
    const res = await fetch('/api/log/nutrition-report', { credentials: 'include' });
    if (!res.ok) return [];
    return res.json();
  };

  const save = async (payload: { data: any }) => {
    const res = await fetch('/api/log/nutrition-report', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload.data) });
    return res.json();
  };
  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setRows(await list()), [list]);
  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await save({
        data: {
          reportDate: f.reportDate,
          dayType: f.dayType,
          breakfast: f.breakfast || null,
          lunch: f.lunch || null,
          dinner: f.dinner || null,
          snacks: f.snacks || null,
          preWorkoutMeal: f.preWorkoutMeal || null,
          postWorkoutMeal: f.postWorkoutMeal || null,
          notes: f.notes || null,
          estimateMacros: true,
        },
      });
      toast.success(r.macros ? `Saved — ~${r.macros.calories} kcal` : "Report saved");
      setF(empty);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Nutrition Report" subtitle="Log your day and let Alex estimate macros." />
      <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 mb-6 space-y-3 animate-fade-up">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Date</Label>
            <Input type="date" value={f.reportDate} onChange={(e) => setF({ ...f, reportDate: e.target.value })} required /></div>
          <div className="space-y-1"><Label>Day type</Label>
            <Select value={f.dayType} onValueChange={(v) => setF({ ...f, dayType: v as DayType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Workout day">Workout day</SelectItem>
                <SelectItem value="Rest day">Rest day</SelectItem>
                <SelectItem value="Cheat day">Cheat day</SelectItem>
              </SelectContent>
            </Select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Breakfast</Label><Input value={f.breakfast} onChange={(e) => setF({ ...f, breakfast: e.target.value })} /></div>
          <div className="space-y-1"><Label>Lunch</Label><Input value={f.lunch} onChange={(e) => setF({ ...f, lunch: e.target.value })} /></div>
          <div className="space-y-1"><Label>Dinner</Label><Input value={f.dinner} onChange={(e) => setF({ ...f, dinner: e.target.value })} /></div>
          <div className="space-y-1"><Label>Snacks</Label><Input value={f.snacks} onChange={(e) => setF({ ...f, snacks: e.target.value })} /></div>
          <div className="space-y-1"><Label>Pre-workout</Label><Input value={f.preWorkoutMeal} onChange={(e) => setF({ ...f, preWorkoutMeal: e.target.value })} /></div>
          <div className="space-y-1"><Label>Post-workout</Label><Input value={f.postWorkoutMeal} onChange={(e) => setF({ ...f, postWorkoutMeal: e.target.value })} /></div>
        </div>
        <div className="space-y-1"><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <Button type="submit" disabled={busy} className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300">
          {busy ? <><Loader2 className="size-4 mr-1.5 animate-spin" />Estimating macros…</> : <><Sparkles className="size-4 mr-1.5" />Save & estimate macros</>}
        </Button>
      </form>

      <div className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-slate-400 text-center py-10">No reports yet.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/5">
            <div className="font-medium text-slate-100">{formatDate(r.reportDate)} <span className="text-xs text-slate-400 font-normal">• {r.dayType ?? "—"}</span></div>
            <div className="text-xs text-slate-400 mt-0.5">
              {r.calories ?? "—"} kcal • P {r.proteinG ?? 0}g • C {r.carbsG ?? 0}g • F {r.fatsG ?? 0}g
            </div>
            {(r.breakfast || r.lunch || r.dinner) && (
              <div className="text-xs mt-1 text-slate-400">{[r.breakfast, r.lunch, r.dinner, r.snacks].filter(Boolean).join(" · ")}</div>
            )}
            {r.notes && <div className="text-xs mt-1 italic text-slate-300">{r.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
