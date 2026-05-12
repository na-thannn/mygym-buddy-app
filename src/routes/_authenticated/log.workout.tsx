import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/log/workout")({
  head: () => ({ meta: [{ title: "Nhật ký tập — HL Fitness" }] }),
  component: WorkoutLog,
});

type Row = { id: string; performed_at: string; exercise: string; sets: number | null; reps: number | null; weight_kg: number | null; notes: string | null };

function WorkoutLog() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState({ exercise: "", sets: "", reps: "", weight_kg: "", notes: "" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("workout_logs").select("*").eq("user_id", user.id).order("performed_at", { ascending: false }).limit(100);
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !f.exercise.trim()) return;
    const num = (s: string) => (s ? Number(s) : null);
    const { error } = await supabase.from("workout_logs").insert({
      user_id: user.id,
      exercise: f.exercise.trim(),
      sets: num(f.sets), reps: num(f.reps), weight_kg: num(f.weight_kg),
      notes: f.notes || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Đã ghi bài tập"); setF({ exercise: "", sets: "", reps: "", weight_kg: "", notes: "" }); load(); }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Nhật ký tập luyện" subtitle="Ghi lại bài tập của bạn" />
      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 mb-6 space-y-3">
        <div className="space-y-1"><Label>Bài tập</Label>
          <Input value={f.exercise} onChange={(e) => setF({ ...f, exercise: e.target.value })} placeholder="VD: Bench Press" required maxLength={100} /></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1"><Label>Sets</Label><Input type="number" value={f.sets} onChange={(e) => setF({ ...f, sets: e.target.value })} /></div>
          <div className="space-y-1"><Label>Reps</Label><Input type="number" value={f.reps} onChange={(e) => setF({ ...f, reps: e.target.value })} /></div>
          <div className="space-y-1"><Label>Tạ (kg)</Label><Input type="number" step="0.5" value={f.weight_kg} onChange={(e) => setF({ ...f, weight_kg: e.target.value })} /></div>
        </div>
        <div className="space-y-1"><Label>Ghi chú</Label><Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <Button type="submit">Thêm bài tập</Button>
      </form>
      <div className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Chưa có bài tập nào.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-3 flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-medium text-sm">{r.exercise}</div>
              <div className="text-xs text-muted-foreground">
                {formatDateTime(r.performed_at)} {r.sets && r.reps ? `• ${r.sets}×${r.reps}` : ""} {r.weight_kg ? `• ${r.weight_kg}kg` : ""}
              </div>
              {r.notes && <div className="text-xs mt-1">{r.notes}</div>}
            </div>
            <Button variant="ghost" size="icon" onClick={async () => { await supabase.from("workout_logs").delete().eq("id", r.id); load(); }}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}