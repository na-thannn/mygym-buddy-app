import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/log/nutrition-report")({
  head: () => ({ meta: [{ title: "Báo cáo dinh dưỡng — HL Fitness" }] }),
  component: NutritionReport,
});

type Row = {
  id: string; report_date: string; day_type: string | null;
  calories: number | null; protein_g: number | null; carbs_g: number | null; fats_g: number | null;
  breakfast: string | null; lunch: string | null; dinner: string | null; snacks: string | null;
  pre_workout_meal: string | null; post_workout_meal: string | null; notes: string | null;
};

const empty = {
  report_date: new Date().toISOString().slice(0, 10),
  day_type: "workout",
  calories: "", protein_g: "", carbs_g: "", fats_g: "",
  breakfast: "", lunch: "", dinner: "", snacks: "",
  pre_workout_meal: "", post_workout_meal: "", notes: "",
};

function NutritionReport() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState(empty);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("nutrition_reports").select("*").eq("user_id", user.id).order("report_date", { ascending: false }).limit(60);
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const num = (s: string) => (s ? Number(s) : null);
    const { error } = await supabase.from("nutrition_reports").insert({
      user_id: user.id,
      report_date: f.report_date,
      day_type: f.day_type || null,
      calories: num(f.calories), protein_g: num(f.protein_g), carbs_g: num(f.carbs_g), fats_g: num(f.fats_g),
      breakfast: f.breakfast || null, lunch: f.lunch || null, dinner: f.dinner || null, snacks: f.snacks || null,
      pre_workout_meal: f.pre_workout_meal || null, post_workout_meal: f.post_workout_meal || null,
      notes: f.notes || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Đã lưu báo cáo"); setF(empty); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Xoá báo cáo này?")) return;
    await supabase.from("nutrition_reports").delete().eq("id", id);
    load();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Báo cáo dinh dưỡng" subtitle="Tổng hợp dinh dưỡng theo ngày — đồng bộ định dạng với AI Coach" />
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Ngày</Label>
            <Input type="date" value={f.report_date} onChange={(e) => setF({ ...f, report_date: e.target.value })} required /></div>
          <div className="space-y-1"><Label>Loại ngày</Label>
            <Select value={f.day_type} onValueChange={(v) => setF({ ...f, day_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="workout">Ngày tập (Workout)</SelectItem>
                <SelectItem value="rest">Ngày nghỉ (Rest)</SelectItem>
                <SelectItem value="cheat">Cheat day</SelectItem>
              </SelectContent>
            </Select></div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-1"><Label className="text-xs">Calo</Label><Input type="number" value={f.calories} onChange={(e) => setF({ ...f, calories: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Protein (g)</Label><Input type="number" value={f.protein_g} onChange={(e) => setF({ ...f, protein_g: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Carbs (g)</Label><Input type="number" value={f.carbs_g} onChange={(e) => setF({ ...f, carbs_g: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Fat (g)</Label><Input type="number" value={f.fats_g} onChange={(e) => setF({ ...f, fats_g: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Sáng</Label><Input value={f.breakfast} onChange={(e) => setF({ ...f, breakfast: e.target.value })} /></div>
          <div className="space-y-1"><Label>Trưa</Label><Input value={f.lunch} onChange={(e) => setF({ ...f, lunch: e.target.value })} /></div>
          <div className="space-y-1"><Label>Tối</Label><Input value={f.dinner} onChange={(e) => setF({ ...f, dinner: e.target.value })} /></div>
          <div className="space-y-1"><Label>Ăn vặt</Label><Input value={f.snacks} onChange={(e) => setF({ ...f, snacks: e.target.value })} /></div>
          <div className="space-y-1"><Label>Trước tập</Label><Input value={f.pre_workout_meal} onChange={(e) => setF({ ...f, pre_workout_meal: e.target.value })} /></div>
          <div className="space-y-1"><Label>Sau tập</Label><Input value={f.post_workout_meal} onChange={(e) => setF({ ...f, post_workout_meal: e.target.value })} /></div>
        </div>
        <div className="space-y-1"><Label>Ghi chú</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <Button type="submit">Lưu báo cáo</Button>
      </form>

      <div className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Chưa có báo cáo.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-3 flex items-start justify-between gap-2">
            <div className="min-w-0 text-sm">
              <div className="font-medium">{formatDate(r.report_date)} <span className="text-xs text-muted-foreground font-normal">• {r.day_type ?? "—"}</span></div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {r.calories ?? "—"} kcal • P {r.protein_g ?? 0}g • C {r.carbs_g ?? 0}g • F {r.fats_g ?? 0}g
              </div>
              {(r.breakfast || r.lunch || r.dinner) && (
                <div className="text-xs mt-1 text-muted-foreground">{[r.breakfast, r.lunch, r.dinner, r.snacks].filter(Boolean).join(" · ")}</div>
              )}
              {r.notes && <div className="text-xs mt-1 italic">{r.notes}</div>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}