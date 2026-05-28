import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ClipboardList, Dumbbell, Headphones } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/authContext";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pt-inbox")({
  head: () => ({ meta: [{ title: "PT Desk - HL Fitness" }] }),
  component: PtDesk,
});

type Booking = {
  id: string;
  customerId: string;
  ptId?: string | null;
  status: string;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string | null;
};

type Ticket = {
  id: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  status: string;
};

type Customer = {
  id: string;
  displayName: string;
  email: string;
  canViewFitness: boolean;
};

function PtDesk() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingRes, supportRes, customerRes] = await Promise.all([
        fetch("/api/bookings", { credentials: "include" }),
        fetch("/api/support", { credentials: "include" }),
        fetch("/api/customers", { credentials: "include" }),
      ]);
      if (!bookingRes.ok || !supportRes.ok || !customerRes.ok)
        throw new Error("Unable to load PT data");
      setBookings(await bookingRes.json());
      setTickets((await supportRes.json()).tickets ?? []);
      setCustomers((await customerRes.json()).customers ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load PT data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const action = async (url: string, body: Record<string, unknown>, success: string) => {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "PATCH",
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

  if (!user || !["admin", "pt"].includes(user.role)) {
    return <AccessDenied title="PT access required" />;
  }

  const activeBookings = bookings.filter((row) =>
    ["pending", "rescheduled", "confirmed"].includes(row.status),
  );
  const activeTickets = tickets.filter((row) => !["resolved", "closed"].includes(row.status));

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 pb-24 md:pb-8">
      <PageHeader
        title="PT Desk"
        subtitle="Assigned clients, session requests, and escalated support."
      />

      {loading && <div className="text-sm text-slate-400">Loading PT desk...</div>}

      {!loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-3 mb-6">
            <Metric
              label="Assigned clients"
              value={customers.length}
              icon={<Dumbbell className="size-5" />}
            />
            <Metric
              label="Active bookings"
              value={activeBookings.length}
              icon={<ClipboardList className="size-5" />}
            />
            <Metric
              label="Support tickets"
              value={activeTickets.length}
              icon={<Headphones className="size-5" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
            <section className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">Session requests</h2>
              <div className="space-y-3">
                {activeBookings.length === 0 && (
                  <div className="text-sm text-slate-400">No active PT bookings.</div>
                )}
                {activeBookings.map((booking) => (
                  <div key={booking.id} className="rounded-xl bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-100">
                          {booking.customerId}
                        </div>
                        <div className="text-xs text-slate-400">
                          {booking.status.toUpperCase()} - {formatDate(booking.scheduledAt)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {booking.status !== "confirmed" && (
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              action(
                                "/api/bookings",
                                { id: booking.id, action: "accept" },
                                "Booking accepted",
                              )
                            }
                          >
                            Accept
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() =>
                            action(
                              "/api/bookings",
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

            <section className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">Escalated support</h2>
              <div className="space-y-3">
                {activeTickets.length === 0 && (
                  <div className="text-sm text-slate-400">No assigned support tickets.</div>
                )}
                {activeTickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-xl bg-white/5 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-100">{ticket.subject}</div>
                        <div className="text-xs text-slate-400">
                          {ticket.customerName} - {ticket.status}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          action(
                            "/api/support",
                            {
                              id: ticket.id,
                              status: "resolved",
                              resolutionNotes: "Resolved by PT.",
                            },
                            "Ticket resolved",
                          )
                        }
                      >
                        Resolve
                      </Button>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{ticket.message}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-5">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">Assigned clients</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {customers.length === 0 && (
                <div className="text-sm text-slate-400">No clients assigned yet.</div>
              )}
              {customers.map((customer) => (
                <div key={customer.id} className="rounded-xl bg-white/5 p-4">
                  <div className="text-sm font-medium text-slate-100">{customer.displayName}</div>
                  <div className="text-xs text-slate-400">{customer.email}</div>
                  <div className="mt-2 text-xs text-yellow-200">
                    {customer.canViewFitness
                      ? "Progress data available"
                      : "Progress data restricted"}
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
