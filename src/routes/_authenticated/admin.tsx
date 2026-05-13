import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { relativeTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Quản trị — HL Fitness" }] }),
  component: AdminPage,
});

type App = { id: string; user_id: string; status: string; message: string | null; created_at: string; name?: string; email?: string };

function AdminPage() {
  const { user, role } = useAuth();
  const [apps, setApps] = useState<App[]>([]);

  if (role && role !== "admin") {
    throw redirect({ to: "/feed" });
  }

  const load = async () => {
    const { data } = await supabase
      .from("pt_applications")
      .select("id, user_id, status, message, created_at")
      .order("created_at", { ascending: false });
    if (!data) { setApps([]); return; }
    const uids = [...new Set(data.map((a) => a.user_id))];
    const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", uids);
    const map = new Map((profs ?? []).map((p) => [p.id, p.display_name]));
    setApps(data.map((a) => ({ ...a, name: map.get(a.user_id) ?? "Thành viên" })));
  };
  useEffect(() => { load(); }, []);

  const decide = async (a: App, approve: boolean) => {
    if (!user) return;
    const { error } = await supabase.from("pt_applications")
      .update({ status: approve ? "approved" : "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    if (approve) {
      const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: a.user_id, role: "pt" });
      if (roleErr && !roleErr.message.includes("duplicate")) toast.error(roleErr.message);
    }
    toast.success(approve ? "Đã duyệt PT" : "Đã từ chối");
    load();
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <PageHeader title="Quản trị" subtitle="Duyệt yêu cầu trở thành Huấn luyện viên" />
      <div className="space-y-2">
        {apps.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Chưa có yêu cầu nào.</div>}
        {apps.map((a) => (
          <div key={a.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground">{relativeTime(a.created_at)} • Trạng thái: <b className="text-foreground">{a.status}</b></div>
                {a.message && <div className="text-xs mt-1 italic">"{a.message}"</div>}
              </div>
              {a.status === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => decide(a, true)}>Duyệt</Button>
                  <Button size="sm" variant="ghost" onClick={() => decide(a, false)}>Từ chối</Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}