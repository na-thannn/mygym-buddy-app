import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { generateWorkoutPlan } from "@/lib/coach.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Sparkles, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({ meta: [{ title: "Kế hoạch tập — HL Fitness" }] }),
  component: PlansPage,
});

type Exercise = { name: string; sets: number; reps: string; rest_sec?: number; notes?: string };
type Day = { day: string; focus: string; exercises: Exercise[] };
type Plan = { title: string; days: Day[]; notes?: string };
type Row = { id: string; title: string; created_at: string; plan: Plan };

function PlansPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ goal: "Tăng cơ giảm mỡ", daysPerWeek: "4", notes: "" });
  const [busy, setBusy] = useState(false);
  const gen = useServerFn(generateWorkoutPlan);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("workout_plans")
      .select("id, title, created_at, plan")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await gen({ data: { goal: form.goal, daysPerWeek: Number(form.daysPerWeek), notes: form.notes || undefined } });
      toast.success("Đã tạo kế hoạch tập");
      setOpen(r.planId);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi tạo kế hoạch");
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Xoá kế hoạch này?")) return;
    await supabase.from("workout_plans").delete().eq("id", id);
    load();
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Kế hoạch tập" subtitle="AI Coach soạn theo dữ liệu cá nhân của bạn" />

      <form onSubmit={create} className="rounded-xl border border-border bg-card p-4 mb-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2"><Label>Mục tiêu</Label>
            <Input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} maxLength={500} required /></div>
          <div className="space-y-1"><Label>Số buổi/tuần</Label>
            <Input type="number" min={1} max={7} value={form.daysPerWeek} onChange={(e) => setForm({ ...form, daysPerWeek: e.target.value })} required /></div>
        </div>
        <div className="space-y-1"><Label>Ghi chú (chấn thương, thời gian rảnh…)</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} rows={2} /></div>
        <Button type="submit" disabled={busy}>
          {busy ? <><Loader2 className="size-4 animate-spin mr-1.5" /> Đang tạo…</> : <><Sparkles className="size-4 mr-1.5" /> Tạo kế hoạch</>}
        </Button>
      </form>

      <div className="space-y-2">
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Chưa có kế hoạch nào.</div>}
        {rows.map((r) => {
          const isOpen = open === r.id;
          return (
            <div key={r.id} className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between p-3">
                <button className="flex-1 text-left min-w-0" onClick={() => setOpen(isOpen ? null : r.id)}>
                  <div className="font-medium text-sm truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(r.created_at)} • {r.plan?.days?.length ?? 0} buổi/tuần</div>
                </button>
                <Button variant="ghost" size="icon" onClick={() => setOpen(isOpen ? null : r.id)}>
                  {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="size-4" /></Button>
              </div>
              {isOpen && r.plan?.days && (
                <div className="border-t border-border p-3 space-y-3">
                  {r.plan.days.map((d, i) => (
                    <div key={i}>
                      <div className="text-sm font-semibold">{d.day} <span className="text-muted-foreground font-normal">— {d.focus}</span></div>
                      <ul className="mt-1 space-y-1">
                        {d.exercises.map((ex, j) => (
                          <li key={j} className="text-xs text-muted-foreground">
                            • <span className="text-foreground font-medium">{ex.name}</span> — {ex.sets}×{ex.reps}
                            {ex.rest_sec ? ` • nghỉ ${ex.rest_sec}s` : ""}
                            {ex.notes ? ` • ${ex.notes}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {r.plan.notes && <div className="text-xs italic text-muted-foreground border-t border-border pt-2">{r.plan.notes}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}