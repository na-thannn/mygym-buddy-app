import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
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
  head: () => ({ meta: [{ title: "Báo cáo dinh dưỡng — HL Fitness" }] }),
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
  const list = useServerFn(listNutritionReports);
  const save = useServerFn(saveNutritionReport);
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
      toast.success(r.macros ? `Đã lưu — ~${r.macros.calories} kcal` : "Đã lưu báo cáo");
      setF(empty);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Báo cáo dinh dưỡng" subtitle="Lưu báo cáo — Alex tự ước tính macros bằng AI" />
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Ngày</Label>
            <Input type="date" value={f.reportDate} onChange={(e) => setF({ ...f, reportDate: e.target.value })} required /></div>
          <div className="space-y-1"><Label>Loại ngày</Label>
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
          <div className="space-y-1"><Label>Sáng</Label><Input value={f.breakfast} onChange={(e) => setF({ ...f, breakfast: e.target.value })} /></div>
          <div className="space-y-1"><Label>Trưa</Label><Input value={f.lunch} onChange={(e) => setF({ ...f, lunch: e.target.value })} /></div>
          <div className="space-y-1"><Label>Tối</Label><Input value={f.dinner} onChange={(e) => setF({ ...f, dinner: e.target.value })} /></div>
          <div className="space-y-1"><Label>Ăn vặt</Label><Input value={f.snacks} onChange={(e) => setF({ ...f, snacks: e.target.value })} /></div>
          <div className="space-y-1"><Label>Trước tập</Label><Input value={f.preWorkoutMeal} onChange={(e) => setF({ ...f, preWorkoutMeal: e.target.value })} /></div>
          <div className="space-y-1"><Label>Sau tập</Label><Input value={f.postWorkoutMeal} onChange={(e) => setF({ ...f, postWorkoutMeal: e.target.value })} /></div>
        </div>
        <div className="space-y-1"><Label>Ghi chú</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <Button type="submit" disabled={busy}>
          {busy ? <><Loader2 className="size-4 mr-1.5 animate-spin" />Đang tính macros…</> : <><Sparkles className="size-4 mr-1.5" />Lưu & tính macros</>}
        </Button>
      </form>

      <div className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Chưa có báo cáo.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="font-medium">{formatDate(r.reportDate)} <span className="text-xs text-muted-foreground font-normal">• {r.dayType ?? "—"}</span></div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {r.calories ?? "—"} kcal • P {r.proteinG ?? 0}g • C {r.carbsG ?? 0}g • F {r.fatsG ?? 0}g
            </div>
            {(r.breakfast || r.lunch || r.dinner) && (
              <div className="text-xs mt-1 text-muted-foreground">{[r.breakfast, r.lunch, r.dinner, r.snacks].filter(Boolean).join(" · ")}</div>
            )}
            {r.notes && <div className="text-xs mt-1 italic">{r.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
