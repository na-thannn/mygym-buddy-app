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
import { Trash2, Upload } from "lucide-react";
import { formatDate } from "@/lib/format";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_authenticated/inbody")({
  head: () => ({ meta: [{ title: "InBody — HL Fitness" }] }),
  component: InBodyPage,
});

type Row = {
  id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  skeletal_muscle_kg: number | null;
  bmi: number | null;
  visceral_fat: number | null;
  file_url: string | null;
  notes: string | null;
};

function InBodyPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState({
    measured_at: new Date().toISOString().slice(0, 10),
    weight_kg: "",
    body_fat_pct: "",
    skeletal_muscle_kg: "",
    bmi: "",
    visceral_fat: "",
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("inbody_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("measured_at", { ascending: false });
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    let file_url: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("inbody").upload(path, file);
      if (upErr) { toast.error(upErr.message); setBusy(false); return; }
      file_url = path;
    }
    const num = (s: string) => (s ? Number(s) : null);
    const { error } = await supabase.from("inbody_entries").insert({
      user_id: user.id,
      measured_at: f.measured_at,
      weight_kg: num(f.weight_kg),
      body_fat_pct: num(f.body_fat_pct),
      skeletal_muscle_kg: num(f.skeletal_muscle_kg),
      bmi: num(f.bmi),
      visceral_fat: num(f.visceral_fat),
      notes: f.notes || null,
      file_url,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Đã thêm kết quả InBody");
    setF({ ...f, weight_kg: "", body_fat_pct: "", skeletal_muscle_kg: "", bmi: "", visceral_fat: "", notes: "" });
    setFile(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Xoá kết quả này?")) return;
    await supabase.from("inbody_entries").delete().eq("id", id);
    load();
  };

  const openFile = async (path: string) => {
    const { data, error } = await supabase.storage.from("inbody").createSignedUrl(path, 60);
    if (error) { toast.error(error.message); return; }
    window.open(data.signedUrl, "_blank");
  };

  const chartData = [...rows].reverse().map((r) => ({
    date: formatDate(r.measured_at),
    weight: r.weight_kg,
    fat: r.body_fat_pct,
    muscle: r.skeletal_muscle_kg,
  }));

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <PageHeader title="InBody" subtitle="Theo dõi chỉ số cơ thể qua các lần đo" />

      <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 mb-6 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="space-y-1"><Label>Ngày đo</Label>
            <Input type="date" value={f.measured_at} onChange={(e) => setF({ ...f, measured_at: e.target.value })} required /></div>
          <div className="space-y-1"><Label>Cân nặng (kg)</Label>
            <Input type="number" step="0.1" value={f.weight_kg} onChange={(e) => setF({ ...f, weight_kg: e.target.value })} /></div>
          <div className="space-y-1"><Label>Mỡ (%)</Label>
            <Input type="number" step="0.1" value={f.body_fat_pct} onChange={(e) => setF({ ...f, body_fat_pct: e.target.value })} /></div>
          <div className="space-y-1"><Label>Cơ xương (kg)</Label>
            <Input type="number" step="0.1" value={f.skeletal_muscle_kg} onChange={(e) => setF({ ...f, skeletal_muscle_kg: e.target.value })} /></div>
          <div className="space-y-1"><Label>BMI</Label>
            <Input type="number" step="0.1" value={f.bmi} onChange={(e) => setF({ ...f, bmi: e.target.value })} /></div>
          <div className="space-y-1"><Label>Mỡ nội tạng</Label>
            <Input type="number" step="0.1" value={f.visceral_fat} onChange={(e) => setF({ ...f, visceral_fat: e.target.value })} /></div>
        </div>
        <div className="space-y-1"><Label>Ghi chú</Label>
          <Textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></div>
        <div className="space-y-1">
          <Label className="cursor-pointer inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <Upload className="size-4" /> {file ? file.name : "Tải kết quả InBody (ảnh / PDF)"}
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </Label>
        </div>
        <Button type="submit" disabled={busy}>Thêm kết quả</Button>
      </form>

      {chartData.length >= 2 && (
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <h3 className="text-sm font-semibold mb-3">Biểu đồ tiến độ</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="weight" name="Cân (kg)" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="fat" name="Mỡ %" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="muscle" name="Cơ (kg)" stroke="#22c55e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Lịch sử ({rows.length})</h3>
        {rows.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">Chưa có dữ liệu InBody.</div>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <div className="font-medium text-sm">{formatDate(r.measured_at)}</div>
              <div className="flex gap-1">
                {r.file_url && <Button variant="ghost" size="sm" onClick={() => openFile(r.file_url!)}>Xem file</Button>}
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="size-4" /></Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {r.weight_kg != null && <span>Cân: <b className="text-foreground">{r.weight_kg}kg</b></span>}
              {r.body_fat_pct != null && <span>Mỡ: <b className="text-foreground">{r.body_fat_pct}%</b></span>}
              {r.skeletal_muscle_kg != null && <span>Cơ: <b className="text-foreground">{r.skeletal_muscle_kg}kg</b></span>}
              {r.bmi != null && <span>BMI: <b className="text-foreground">{r.bmi}</b></span>}
              {r.visceral_fat != null && <span>Mỡ nội tạng: <b className="text-foreground">{r.visceral_fat}</b></span>}
            </div>
            {r.notes && <div className="text-xs mt-1">{r.notes}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}