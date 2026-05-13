import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Tiến độ — HL Fitness" }] }),
  component: ProgressPage,
});

function ProgressPage() {
  const { user } = useAuth();
  const [inbody, setInbody] = useState<{ date: string; weight: number | null; fat: number | null }[]>([]);
  const [meals, setMeals] = useState<{ date: string; calories: number }[]>([]);
  const [workouts, setWorkouts] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ib } = await supabase.from("inbody_entries").select("measured_at, weight_kg, body_fat_pct").eq("user_id", user.id).order("measured_at");
      setInbody((ib ?? []).map((r) => ({ date: formatDate(r.measured_at), weight: r.weight_kg, fat: r.body_fat_pct })));

      const since = new Date(Date.now() - 14 * 86400000).toISOString();
      const { data: ml } = await supabase.from("meal_logs").select("eaten_at, calories").eq("user_id", user.id).gte("eaten_at", since);
      const mmap = new Map<string, number>();
      (ml ?? []).forEach((m) => {
        const d = new Date(m.eaten_at).toISOString().slice(0, 10);
        mmap.set(d, (mmap.get(d) ?? 0) + Number(m.calories ?? 0));
      });
      setMeals([...mmap.entries()].sort().map(([d, c]) => ({ date: d.slice(5), calories: Math.round(c) })));

      const { data: wl } = await supabase.from("workout_logs").select("performed_at").eq("user_id", user.id).gte("performed_at", since);
      const wmap = new Map<string, number>();
      (wl ?? []).forEach((w) => {
        const d = new Date(w.performed_at).toISOString().slice(0, 10);
        wmap.set(d, (wmap.get(d) ?? 0) + 1);
      });
      setWorkouts([...wmap.entries()].sort().map(([d, c]) => ({ date: d.slice(5), count: c })));
    })();
  }, [user]);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <PageHeader title="Tiến độ" subtitle="Tổng quan cơ thể và hoạt động 14 ngày qua" />

      <Card title="InBody — Cân nặng & % mỡ">
        {inbody.length < 2 ? <Empty msg="Cần ít nhất 2 lần đo InBody." /> : (
          <div className="h-64">
            <ResponsiveContainer><LineChart data={inbody}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
              <Line type="monotone" dataKey="weight" name="Cân (kg)" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="fat" name="Mỡ %" stroke="#ef4444" strokeWidth={2} />
            </LineChart></ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="Calo theo ngày (14 ngày)">
        {meals.length === 0 ? <Empty msg="Chưa có bữa ăn nào trong 14 ngày." /> : (
          <div className="h-56">
            <ResponsiveContainer><BarChart data={meals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} /><Tooltip />
              <Bar dataKey="calories" fill="hsl(var(--primary))" />
            </BarChart></ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card title="Số bài tập theo ngày (14 ngày)">
        {workouts.length === 0 ? <Empty msg="Chưa có buổi tập nào trong 14 ngày." /> : (
          <div className="h-56">
            <ResponsiveContainer><BarChart data={workouts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip />
              <Bar dataKey="count" name="Bài tập" fill="#22c55e" />
            </BarChart></ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}
function Empty({ msg }: { msg: string }) {
  return <div className="text-sm text-muted-foreground text-center py-6">{msg}</div>;
}