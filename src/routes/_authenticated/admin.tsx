import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  BadgeCheck,
  CalendarDays,
  Headphones,
  Loader2,
  Shield,
  UserCog,
  Users,
  UserSquare2,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import { AccessDenied } from "@/components/AccessDenied";
import { ROLE_LABELS, type AppRole } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — HL Fitness" }] }),
  component: AdminPage,
});

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: AppRole;
  assignedPtId: string | null;
  createdAt: string;
};

type PtOption = {
  id: string;
  email: string;
  displayName: string;
};

type AdminStats = {
  totalUsers: number;
  byRole: { admin: number; staff: number; pt: number; customer: number };
  unassignedCustomers: number;
  ptLoads: { id: string; displayName: string; email: string; assignedCount: number }[];
  bookingsByStatus: Record<string, number>;
  supportByStatus: Record<string, number>;
  openSupportTickets: number;
  groupClasses: { sessions: number; enrollments: number; attended: number };
};

function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pts, setPts] = useState<PtOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats", { credentials: "include" });
    if (!res.ok) return null;
    return res.json();
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users", { credentials: "include" });
    if (!res.ok) return null;
    return res.json();
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([loadStats(), loadUsers()]);
      if (statsRes) setStats(statsRes as AdminStats);
      if (usersRes) {
        setUsers((usersRes as { users: AdminUser[] }).users ?? []);
        setPts((usersRes as { pts: PtOption[] }).pts ?? []);
      }
    } catch (err) {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [loadStats, loadUsers]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredUsers = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (u) => u.displayName.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle),
    );
  }, [filter, users]);

  const updateUser = (id: string, patch: Partial<AdminUser>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const saveUser = async (userRow: AdminUser) => {
    if (savingId) return;
    setSavingId(userRow.id);
    try {
      const body: Record<string, unknown> = { id: userRow.id, role: userRow.role };
      if (userRow.role === "customer") {
        body.assignedPtId = userRow.assignedPtId ?? null;
      }
      const res = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Update failed");
      }
      toast.success("User updated");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  };

  if (user?.role !== "admin") {
    return <AccessDenied title="Admin access required" />;
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 pb-24 md:pb-8">
      <PageHeader title="Admin" subtitle="Manage users, roles, and PT assignments." />

      {loading && <div className="text-sm text-slate-400">Loading admin data...</div>}

      {!loading && stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            label="Total users"
            value={stats.totalUsers}
            icon={<Users className="size-5" />}
          />
          <StatCard
            label="Customers"
            value={stats.byRole.customer}
            icon={<UserSquare2 className="size-5" />}
          />
          <StatCard label="PTs" value={stats.byRole.pt} icon={<BadgeCheck className="size-5" />} />
          <StatCard
            label="Unassigned"
            value={stats.unassignedCustomers}
            icon={<UserCog className="size-5" />}
          />
          <StatCard
            label="Open support"
            value={stats.openSupportTickets}
            icon={<Headphones className="size-5" />}
          />
          <StatCard
            label="Bookings"
            value={Object.values(stats.bookingsByStatus ?? {}).reduce(
              (sum, value) => sum + value,
              0,
            )}
            icon={<Shield className="size-5" />}
          />
          <StatCard
            label="Class sessions"
            value={stats.groupClasses.sessions}
            icon={<CalendarDays className="size-5" />}
          />
          <StatCard
            label="Attendance"
            value={stats.groupClasses.attended}
            icon={<BadgeCheck className="size-5" />}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                User management
              </div>
              <h2 className="text-lg font-semibold text-slate-100 mt-2">Roles and assignments</h2>
            </div>
            <div className="size-10 rounded-2xl bg-white/5 border border-white/10 grid place-items-center text-slate-300">
              <Shield className="size-5" />
            </div>
          </div>

          <div className="mb-4 max-w-sm">
            <Label>Search users</Label>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search by name or email"
            />
          </div>

          <div className="space-y-3">
            {filteredUsers.length === 0 && (
              <div className="text-sm text-slate-400">No users found.</div>
            )}
            {filteredUsers.map((u) => (
              <div
                key={u.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{u.displayName}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    {ROLE_LABELS[u.role]}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Select
                      value={u.role}
                      onValueChange={(value) => {
                        const role = value as AppRole;
                        updateUser(u.id, {
                          role,
                          assignedPtId: role === "customer" ? u.assignedPtId : null,
                        });
                      }}
                      disabled={u.id === user.id && u.role === "admin"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label>Assigned PT</Label>
                    <Select
                      value={u.assignedPtId ?? "unassigned"}
                      onValueChange={(value) =>
                        updateUser(u.id, { assignedPtId: value === "unassigned" ? null : value })
                      }
                      disabled={u.role !== "customer"}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {pts.map((pt) => (
                          <SelectItem key={pt.id} value={pt.id}>
                            {pt.displayName} ({pt.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={() => saveUser(u)}
                      disabled={savingId === u.id}
                      className="w-full bg-yellow-400 text-yellow-950 hover:bg-yellow-300"
                    >
                      {savingId === u.id ? (
                        <>
                          <Loader2 className="size-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">PT load</div>
                <h2 className="text-lg font-semibold text-slate-100 mt-2">Client assignments</h2>
              </div>
              <div className="size-10 rounded-2xl bg-white/5 border border-white/10 grid place-items-center text-slate-300">
                <UserCog className="size-5" />
              </div>
            </div>
            {stats?.ptLoads?.length ? (
              <div className="space-y-3">
                {stats.ptLoads.map((pt) => (
                  <div key={pt.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-sm font-semibold text-slate-100">{pt.displayName}</div>
                    <div className="text-xs text-slate-400">{pt.email}</div>
                    <div className="mt-2 text-xs text-yellow-200">
                      {pt.assignedCount} active clients
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-400">No PTs available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</div>
          <div className="text-2xl font-semibold text-slate-100 mt-2">{value}</div>
        </div>
        <div className="size-10 rounded-2xl bg-yellow-400/15 text-yellow-200 grid place-items-center">
          {icon}
        </div>
      </div>
    </div>
  );
}
