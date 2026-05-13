import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/log/nutrition")({
  head: () => ({ meta: [{ title: "Nhật ký dinh dưỡng — HL Fitness" }] }),
  component: NutritionLog,
});

type Row = {
  id: string;
  eaten_at: string;
  meal_type: string | null;
  name: string;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
};

const MEALS = [
  { v: "breakfast", l: "Sáng" },
  { v: "lunch", l: "Trưa" },
  { v: "dinner", l: "Tối" },
  { v: "snack", l: "Phụ" },
];

function NutritionLog() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState({ name: "", meal_type: "breakfast", calories: "", protein_g: "", fat_g: "", carbs_g: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("eaten_at", { ascending: false })
      .limit(100);
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !f.name.trim()) return;
    const num = (s: string) => (s ? Number(s) : null);
    const { error } = await supabase.from("meal_logs").insert({
      user_id: user.id,
      name: f.name.trim(),
      meal_type: f.meal_type,
      calories: num(f.calories),
      protein_g: num(f.protein_g),
      fat_g: num(f.fat_g),
      carbs_g: num(f.carbs_g),
    });
    if (error) toast.error(error.message);
    else { toast.success("Đã ghi bữa ăn"); setF({ ...f, name: "", calories: "", protein_g: "", fat_g: "", carbs_g: "" }); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Xoá bữa ăn này?")) return;
    await supabase.from("meal_logs").delete().eq("id", id);
    load();
  };

  const today = new Date().toDateString();
  const todayRows = rows.filter((r) => new Date(r.eaten_at).toDateString() === today);
  const sum = (k: keyof Row) => todayRows.reduce((s, r) => s + Number(r[k] ?? 0), 0);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Nhật ký dinh dưỡng" subtitle="Theo dõi calo & macro mỗi ngày" />

      <div className="rounded-xl border border-border bg-card p-4 mb-4 grid grid-cols-4 gap-2 text-center">
        <Stat label="Calo" v={sum("calories")} unit="kcal" />
        <Stat label="Protein" v={sum("protein_g")} unit="g" />
        <Stat label="Carbs" v={sum("carbs_g")} unit="g" />
        <Stat label="Fat" v={sum("fat_g")} unit="g" />
      </div>

      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label>Bữa</Label>
            <Select value={f.meal_type} onValueChange={(v) => setF({ ...f, meal_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MEALS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label>Calo (kcal)</Label>
            <Input type="number" value={f.calories} onChange={(e) => setF({ ...f, calories: e.target.value })} /></div>
        </div>
        <div className="space-y-1"><Label>Tên món</Label>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="VD: Cơm gà" required maxLength={120} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1"><Label>Protein (g)</Label>
            <Input type="number" step="0.1" value={f.protein_g} onChange={(e) => setF({ ...f, protein_g: e.target.value })} /></div>
          <div className="space-y-1"><Label>Carbs (g)</Label>
            <Input type="number" step="0.1" value={f.carbs_g} onChange={(e) => setF({ ...f, carbs_g: e.target.value })} /></div>
          <div className="space-y-1"><Label>Fat (g)</Label>
            <Input type="number" step="0.1" value={f.fat_g} onChange={(e) => setF({ ...f, fat_g: e.target.value })} /></div>
        </div>
        <Button type="submit">Thêm bữa ăn</Button>
      </form>

      <div className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Chưa có bữa ăn nào.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-medium text-sm">{r.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatDateTime(r.eaten_at)} • {MEALS.find((m) => m.v === r.meal_type)?.l ?? "—"}
                {r.calories != null && ` • ${r.calories} kcal`}
                {r.protein_g != null && ` • P${r.protein_g}`}
                {r.carbs_g != null && ` • C${r.carbs_g}`}
                {r.fat_g != null && ` • F${r.fat_g}`}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="size-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, v, unit }: { label: string; v: number; unit: string }) {
  return (
    <div>
      <div className="text-lg font-bold">{Math.round(v)}<span className="text-xs text-muted-foreground font-normal ml-0.5">{unit}</span></div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}