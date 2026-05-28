import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarCheck, Headphones, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/authContext";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Staff Ops - HL Fitness" }] }),
  component: StaffPage,
});

type Ticket = {
  id: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  source: string;
  status: string;
  assignedStaffId?: string | null;
  assignedPtId?: string | null;
  createdAt: string;
};

type Booking = {
  id: string;
  customerId: string;
  ptId?: string | null;
  status: string;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string | null;
};

type Customer = {
  id: string;
  displayName: string;
  email: string;
  assignedPtId?: string | null;
  canViewFitness: boolean;
};

type PtOption = {
  id: string;
  displayName: string;
  email: string;
};

function StaffPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pts, setPts] = useState<PtOption[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [supportRes, bookingRes, customerRes, ptsRes] = await Promise.all([
        fetch("/api/support", { credentials: "include" }),
        fetch("/api/bookings", { credentials: "include" }),
        fetch("/api/customers", { credentials: "include" }),
        fetch("/api/pts", { credentials: "include" }),
      ]);
      if (!supportRes.ok || !bookingRes.ok || !customerRes.ok || !ptsRes.ok) {
        throw new Error("Unable to load staff data");
      }
      setTickets((await supportRes.json()).tickets ?? []);
      setBookings(await bookingRes.json());
      setCustomers((await customerRes.json()).customers ?? []);
      setPts((await ptsRes.json()).pts ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load staff data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (
    url: string,
    method: string,
    body: Record<string, unknown>,
    success: string,
  ) => {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Action failed");
      toast.success(success);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return customers.slice(0, 12);
    return customers.filter(
      (customer) =>
        customer.displayName.toLowerCase().includes(needle) ||
        customer.email.toLowerCase().includes(needle),
    );
  }, [customers, filter]);

  if (!user || !["admin", "staff"].includes(user.role)) {
    return <AccessDenied title="Staff access required" />;
  }

  const activeTickets = tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status));
  const pendingBookings = bookings.filter((booking) =>
    ["pending", "rescheduled", "confirmed"].includes(booking.status),
  );

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 pb-24 md:pb-8">
      <PageHeader
        title="Staff Operations"
        subtitle="Support queue, booking operations, and customer lookup."
      />

      {loading && <div className="text-sm text-slate-400">Loading staff dashboard...</div>}

      {!loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <Metric
              label="Open tickets"
              value={activeTickets.length}
              icon={<Headphones className="size-5" />}
            />
            <Metric
              label="Active bookings"
              value={pendingBookings.length}
              icon={<CalendarCheck className="size-5" />}
            />
            <Metric
              label="Customers"
              value={customers.length}
              icon={<Users className="size-5" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <section className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">Support queue</h2>
              <div className="space-y-3">
                {activeTickets.length === 0 && (
                  <div className="text-sm text-slate-400">No open support tickets.</div>
                )}
                {activeTickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-xl bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-100">{ticket.subject}</div>
                        <div className="text-xs text-slate-400">
                          {ticket.customerName} - {ticket.source} - {ticket.status}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy || ticket.assignedStaffId === user.id}
                          onClick={() =>
                            submit(
                              "/api/support",
                              "PATCH",
                              { id: ticket.id, assignedStaffId: user.id, status: "assigned" },
                              "Ticket assigned",
                            )
                          }
                        >
                          Assign me
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            submit(
                              "/api/support",
                              "PATCH",
                              {
                                id: ticket.id,
                                status: "resolved",
                                resolutionNotes: "Resolved by staff.",
                              },
                              "Ticket resolved",
                            )
                          }
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                    {pts.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          value={ticket.assignedPtId ?? ""}
                          onChange={(e) =>
                            submit(
                              "/api/support",
                              "PATCH",
                              {
                                id: ticket.id,
                                assignedPtId: e.target.value || null,
                                status: e.target.value ? "assigned" : "open",
                              },
                              e.target.value ? "Ticket assigned to PT" : "PT assignment cleared",
                            )
                          }
                          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                          disabled={busy}
                        >
                          <option value="">No PT assigned</option>
                          {pts.map((pt) => (
                            <option key={pt.id} value={pt.id}>
                              {pt.displayName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <p className="mt-3 text-sm text-slate-300">{ticket.message}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">Booking operations</h2>
              <div className="space-y-3">
                {pendingBookings.length === 0 && (
                  <div className="text-sm text-slate-400">No active bookings.</div>
                )}
                {pendingBookings.slice(0, 10).map((booking) => (
                  <div key={booking.id} className="rounded-xl bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-100">
                          {booking.status.toUpperCase()}
                        </div>
                        <div className="text-xs text-slate-400">
                          {formatDate(booking.scheduledAt)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() =>
                            submit(
                              "/api/bookings",
                              "PATCH",
                              { id: booking.id, action: "accept" },
                              "Booking confirmed",
                            )
                          }
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            submit(
                              "/api/bookings",
                              "PATCH",
                              { id: booking.id, action: "complete" },
                              "Booking completed",
                            )
                          }
                        >
                          Complete
                        </Button>
                      </div>
                    </div>
                    {booking.notes && (
                      <p className="mt-2 text-xs italic text-slate-300">{booking.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-100">Customer lookup</h2>
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search customer"
                className="max-w-xs"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredCustomers.map((customer) => (
                <div key={customer.id} className="rounded-xl bg-white/5 p-4">
                  <div className="text-sm font-medium text-slate-100">{customer.displayName}</div>
                  <div className="text-xs text-slate-400">{customer.email}</div>
                  <div className="mt-2 text-xs text-slate-300">
                    {customer.assignedPtId ? "Assigned PT set" : "No PT assigned"} -{" "}
                    {customer.canViewFitness ? "Fitness data allowed" : "Operational view only"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
        </div>
        <div className="grid size-10 place-items-center rounded-2xl bg-yellow-400/15 text-yellow-200">
          {icon}
        </div>
      </div>
    </div>
  );
}
