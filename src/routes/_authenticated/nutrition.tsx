import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Apple, ChevronRight, Droplet, Flame, Sparkles, Utensils } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { listNutritionReports } from "@/lib/nutrition.functions";

export const Route = createFileRoute("/_authenticated/nutrition")({
  head: () => ({ meta: [{ title: "Nutrition — HL Fitness" }] }),
  component: Nutrition,
});
type Row = Awaited<ReturnType<typeof listNutritionReports>>[number];
type DayType = "Workout day" | "Rest day" | "Cheat day";

type FormState = {
  reportDate: string;
  dayType: DayType;
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string;
  preWorkoutMeal: string;
  postWorkoutMeal: string;
  notes: string;
  estimateMacros: boolean;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatsG: string;
};

const EMPTY: FormState = {
  reportDate: new Date().toISOString().slice(0, 10),
  dayType: "Workout day",
  breakfast: "",
  lunch: "",
  dinner: "",
  snacks: "",
  preWorkoutMeal: "",
  postWorkoutMeal: "",
  notes: "",
  estimateMacros: true,
  calories: "",
  proteinG: "",
  carbsG: "",
  fatsG: "",
};

function Nutrition() {
  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);

  const list = useCallback(async () => {
    const res = await fetch("/api/log/nutrition-report", { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  }, []);

  const save = async (payload: { data: Record<string, unknown> }) => {
    const res = await fetch("/api/log/nutrition-report", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Save failed");
    }
    return res.json();
  };

  const load = useCallback(async () => setRows(await list()), [list]);

  useEffect(() => {
    load();
  }, [load]);

  const latest = rows[0] ?? null;
  const latestMeals = useMemo(() => {
    if (!latest) return [];
    return [
      { label: "Breakfast", value: latest.breakfast },
      { label: "Lunch", value: latest.lunch },
      { label: "Dinner", value: latest.dinner },
      { label: "Snacks", value: latest.snacks },
      { label: "Pre-workout", value: latest.preWorkoutMeal },
      { label: "Post-workout", value: latest.postWorkoutMeal },
    ].filter((item) => item.value);
  }, [latest]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const hasMeals = [
      f.breakfast,
      f.lunch,
      f.dinner,
      f.snacks,
      f.preWorkoutMeal,
      f.postWorkoutMeal,
    ].some((m) => m.trim());
    const hasNotes = f.notes.trim().length > 0;
    const hasManualMacros = [f.calories, f.proteinG, f.carbsG, f.fatsG].some((m) => m.trim());
    if (f.estimateMacros && !hasMeals) {
      toast.error("Add at least one meal to estimate macros");
      return;
    }
    if (!hasMeals && !hasNotes && !hasManualMacros) {
      toast.error("Add a meal, note, or macros first");
      return;
    }

    const num = (value: string) => {
      if (!value.trim()) return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };
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
          estimateMacros: f.estimateMacros,
          calories: num(f.calories),
          proteinG: num(f.proteinG),
          carbsG: num(f.carbsG),
          fatsG: num(f.fatsG),
        },
      });
      toast.success(r.macros?.calories ? `Saved - ~${r.macros.calories} kcal` : "Report saved");
      setF(EMPTY);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const renderMacro = (value: number | null, suffix: string) =>
    typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}${suffix}` : "-";

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8 pb-24 md:pb-8">
      <PageHeader
        title="Nutrition"
        subtitle="Log your day, then let Alex estimate macros or enter your own."
        action={
          <Button
            asChild
            variant="outline"
            className="border-white/10 text-slate-200 hover:text-yellow-200 hover:border-yellow-500/30"
          >
            <Link to="/trainer">
              AI Meal Plan <ChevronRight className="size-4 ml-1" />
            </Link>
          </Button>
        }
      />

      <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-6">
        <div className="space-y-6">
          <form
            onSubmit={submit}
            className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_rgba(0,0,0,0)_55%)] bg-black/40 backdrop-blur p-6 shadow-[0_30px_80px_-50px_rgba(250,204,21,0.6)] animate-fade-up"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-yellow-300">Daily log</div>
                <h2 className="text-xl font-semibold text-slate-100 mt-2">Log meals</h2>
                <p className="text-sm text-slate-300">
                  Quick entries now, detailed insights later.
                </p>
              </div>
              <div className="size-12 rounded-2xl bg-yellow-400/15 text-yellow-300 grid place-items-center">
                <Utensils className="size-5" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={f.reportDate}
                  onChange={(e) => setF({ ...f, reportDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Day type</Label>
                <Select
                  value={f.dayType}
                  onValueChange={(v) => setF({ ...f, dayType: v as DayType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Workout day">Workout day</SelectItem>
                    <SelectItem value="Rest day">Rest day</SelectItem>
                    <SelectItem value="Cheat day">Cheat day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Breakfast</Label>
                <Input
                  value={f.breakfast}
                  onChange={(e) => setF({ ...f, breakfast: e.target.value })}
                  placeholder="Greek yogurt, berries"
                />
              </div>
              <div className="space-y-1">
                <Label>Lunch</Label>
                <Input
                  value={f.lunch}
                  onChange={(e) => setF({ ...f, lunch: e.target.value })}
                  placeholder="Chicken bowl, salad"
                />
              </div>
              <div className="space-y-1">
                <Label>Dinner</Label>
                <Input
                  value={f.dinner}
                  onChange={(e) => setF({ ...f, dinner: e.target.value })}
                  placeholder="Salmon, rice, greens"
                />
              </div>
              <div className="space-y-1">
                <Label>Snacks</Label>
                <Input
                  value={f.snacks}
                  onChange={(e) => setF({ ...f, snacks: e.target.value })}
                  placeholder="Protein bar"
                />
              </div>
              <div className="space-y-1">
                <Label>Pre-workout</Label>
                <Input
                  value={f.preWorkoutMeal}
                  onChange={(e) => setF({ ...f, preWorkoutMeal: e.target.value })}
                  placeholder="Banana, espresso"
                />
              </div>
              <div className="space-y-1">
                <Label>Post-workout</Label>
                <Input
                  value={f.postWorkoutMeal}
                  onChange={(e) => setF({ ...f, postWorkoutMeal: e.target.value })}
                  placeholder="Shake, oats"
                />
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <Label>Notes</Label>
              <Textarea
                rows={2}
                value={f.notes}
                onChange={(e) => setF({ ...f, notes: e.target.value })}
                placeholder="Energy levels, cravings, timing"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-100">Estimate macros with AI</div>
                  <div className="text-xs text-slate-400">
                    Turn off to enter your own calories and macros.
                  </div>
                </div>
                <Switch
                  checked={f.estimateMacros}
                  onCheckedChange={(checked) => setF({ ...f, estimateMacros: checked })}
                />
              </div>
              <div
                className={`mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 ${f.estimateMacros ? "opacity-60" : ""}`}
              >
                <div className="space-y-1">
                  <Label>Calories</Label>
                  <Input
                    type="number"
                    step="1"
                    value={f.calories}
                    disabled={f.estimateMacros}
                    onChange={(e) => setF({ ...f, calories: e.target.value })}
                    placeholder={f.estimateMacros ? "AI will estimate" : "e.g. 2100"}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Protein (g)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={f.proteinG}
                    disabled={f.estimateMacros}
                    onChange={(e) => setF({ ...f, proteinG: e.target.value })}
                    placeholder={f.estimateMacros ? "AI will estimate" : "e.g. 160"}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Carbs (g)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={f.carbsG}
                    disabled={f.estimateMacros}
                    onChange={(e) => setF({ ...f, carbsG: e.target.value })}
                    placeholder={f.estimateMacros ? "AI will estimate" : "e.g. 220"}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Fats (g)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={f.fatsG}
                    disabled={f.estimateMacros}
                    onChange={(e) => setF({ ...f, fatsG: e.target.value })}
                    placeholder={f.estimateMacros ? "AI will estimate" : "e.g. 70"}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={busy}
                className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300"
              >
                {busy ? (
                  <>
                    <Sparkles className="size-4 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-1.5" />
                    Save log
                  </>
                )}
              </Button>
              <div className="text-xs text-slate-400">
                Your latest entry shows up in the snapshot panel.
              </div>
            </div>
          </form>

          <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">History</div>
                <h3 className="text-lg font-semibold text-slate-100 mt-2">Recent logs</h3>
              </div>
              <div className="size-10 rounded-2xl bg-white/5 border border-white/10 grid place-items-center text-slate-300">
                <Apple className="size-5" />
              </div>
            </div>
            <div className="space-y-3">
              {rows.length === 0 && (
                <div className="text-sm text-slate-400 text-center py-8">No logs yet.</div>
              )}
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-slate-100">
                      {formatDate(r.reportDate)}
                      <span className="text-xs text-slate-400 font-normal">
                        {" "}
                        - {r.dayType ?? "-"}
                      </span>
                    </div>
                    <div className="text-xs text-yellow-200">
                      {renderMacro(r.calories, " kcal")}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    P {renderMacro(r.proteinG, "g")} | C {renderMacro(r.carbsG, "g")} | F{" "}
                    {renderMacro(r.fatsG, "g")}
                  </div>
                  {(r.breakfast || r.lunch || r.dinner || r.snacks) && (
                    <div className="text-xs mt-2 text-slate-400">
                      {[r.breakfast, r.lunch, r.dinner, r.snacks].filter(Boolean).join(" | ")}
                    </div>
                  )}
                  {r.notes && <div className="text-xs mt-2 italic text-slate-300">{r.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur p-6 shadow-[0_25px_60px_-50px_rgba(59,130,246,0.45)] animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Snapshot</div>
                <h3 className="text-lg font-semibold text-slate-100 mt-2">
                  {latest ? `Latest: ${formatDate(latest.reportDate)}` : "No data yet"}
                </h3>
              </div>
              <div className="size-10 rounded-2xl bg-blue-400/15 text-blue-200 grid place-items-center">
                <Flame className="size-5" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-400">Calories</div>
                <div className="text-lg font-semibold text-slate-100">
                  {renderMacro(latest?.calories ?? null, " kcal")}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-400">Protein</div>
                <div className="text-lg font-semibold text-slate-100">
                  {renderMacro(latest?.proteinG ?? null, "g")}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-400">Carbs</div>
                <div className="text-lg font-semibold text-slate-100">
                  {renderMacro(latest?.carbsG ?? null, "g")}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-slate-400">Fats</div>
                <div className="text-lg font-semibold text-slate-100">
                  {renderMacro(latest?.fatsG ?? null, "g")}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Meals</div>
                <h3 className="text-lg font-semibold text-slate-100 mt-2">Latest meals</h3>
              </div>
              <div className="size-10 rounded-2xl bg-yellow-400/15 text-yellow-200 grid place-items-center">
                <Apple className="size-5" />
              </div>
            </div>

            {latestMeals.length === 0 ? (
              <div className="text-sm text-slate-400">Log a meal to see it here.</div>
            ) : (
              <div className="space-y-3">
                {latestMeals.map((meal) => (
                  <div
                    key={meal.label}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      {meal.label}
                    </div>
                    <div className="text-sm text-slate-100 mt-1">{meal.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-black/40 to-emerald-400/10 p-6 animate-fade-up">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-emerald-400/15 text-emerald-200 grid place-items-center">
                <Droplet className="size-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">Fuel reminder</div>
                <div className="text-xs text-slate-300">
                  Balance protein and hydration to recover faster.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
