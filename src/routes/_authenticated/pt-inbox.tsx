import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CalendarOff, ClipboardList, Dumbbell, Headphones, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AccessDenied } from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type GuestMeeting = {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  goal: string;
  experience: string;
  requestedPtId?: string | null;
  assignedPtId?: string | null;
  scheduledAt: string;
  usedFallback: number;
  status: string;
  createdUserId?: string | null;
};

type UnavailableDay = {
  id: string;
  ptId: string;
  unavailableDate: string;
  reason?: string | null;
};

type ServiceOffering = {
  id: string;
  nameEn: string;
  category: string;
  priceVnd: number;
};

type ImportPreviewRow = {
  unavailableDate: string;
  reason: string | null;
  valid: boolean;
  duplicate: boolean;
  errors: string[];
};

function PtDesk() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [guestMeetings, setGuestMeetings] = useState<GuestMeeting[]>([]);
  const [unavailableDays, setUnavailableDays] = useState<UnavailableDay[]>([]);
  const [services, setServices] = useState<ServiceOffering[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [ptBio, setPtBio] = useState("");
  const [ptSpecialties, setPtSpecialties] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
  const [importFileBase64, setImportFileBase64] = useState("");
  const [unavailableDate, setUnavailableDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingRes, supportRes, customerRes, guestRes, unavailableRes, serviceRes] =
        await Promise.all([
          fetch("/api/bookings", { credentials: "include" }),
          fetch("/api/support", { credentials: "include" }),
          fetch("/api/customers", { credentials: "include" }),
          fetch("/api/guest-meetings", { credentials: "include" }),
          fetch("/api/pt-unavailable-days", { credentials: "include" }),
          fetch("/api/pt/services", { credentials: "include" }),
        ]);
      if (
        !bookingRes.ok ||
        !supportRes.ok ||
        !customerRes.ok ||
        !guestRes.ok ||
        !unavailableRes.ok ||
        !serviceRes.ok
      ) {
        throw new Error("Unable to load PT data");
      }
      setBookings(await bookingRes.json());
      setTickets((await supportRes.json()).tickets ?? []);
      setCustomers((await customerRes.json()).customers ?? []);
      setGuestMeetings((await guestRes.json()).meetings ?? []);
      setUnavailableDays((await unavailableRes.json()).days ?? []);
      const servicePayload = await serviceRes.json();
      setServices(servicePayload.services ?? []);
      setSelectedServiceIds(
        (servicePayload.selected ?? []).map(
          (row: { serviceOfferingId: string }) => row.serviceOfferingId,
        ),
      );
      setPtBio(servicePayload.profile?.bioEn ?? "");
      setPtSpecialties(servicePayload.profile?.specialtiesEn ?? "");
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

  const guestAction = async (body: Record<string, unknown>, success: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/guest-meetings", {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Action failed");
      if (payload?.emailSent === false) toast.warning("Saved, but email delivery needs SMTP setup");
      else toast.success(success);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const addUnavailableDay = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!unavailableDate) return;
    setBusy(true);
    try {
      const res = await fetch("/api/pt-unavailable-days", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ unavailableDate }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Unable to save unavailable day");
      setUnavailableDate("");
      toast.success("Unavailable day saved");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save unavailable day");
    } finally {
      setBusy(false);
    }
  };

  const removeUnavailableDay = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/pt-unavailable-days", {
        method: "DELETE",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Unable to remove unavailable day");
      toast.success("Unavailable day removed");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to remove unavailable day");
    } finally {
      setBusy(false);
    }
  };

  const savePtServices = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/pt/services", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceOfferingIds: selectedServiceIds,
          bioEn: ptBio,
          bioVi: ptBio,
          specialtiesEn: ptSpecialties,
          specialtiesVi: ptSpecialties,
          yearsExperience: 0,
          isPublic: 1,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Unable to save services");
      toast.success("PT services saved");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save services");
    } finally {
      setBusy(false);
    }
  };

  const previewUnavailableImport = async (file: File | null) => {
    if (!file) return;
    const base64 = await fileToBase64(file);
    setImportFileBase64(base64);
    const res = await fetch("/api/pt-unavailable-days/import-preview", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileBase64: base64 }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(payload?.error ?? "Unable to preview Excel file");
      return;
    }
    setImportPreview(payload.preview ?? []);
  };

  const confirmUnavailableImport = async () => {
    if (!importFileBase64) return;
    const res = await fetch("/api/pt-unavailable-days/import-preview", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileBase64: importFileBase64, confirm: true }),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(payload?.error ?? "Unable to import Excel file");
      return;
    }
    toast.success(`Imported ${payload.imported ?? 0} unavailable days`);
    setImportPreview([]);
    setImportFileBase64("");
    await load();
  };

  if (!user || !["admin", "pt"].includes(user.role)) {
    return <AccessDenied title="PT access required" />;
  }

  const activeBookings = bookings.filter((row) =>
    ["pending", "rescheduled", "confirmed"].includes(row.status),
  );
  const activeTickets = tickets.filter((row) => !["resolved", "closed"].includes(row.status));
  const activeGuestMeetings = guestMeetings.filter((row) =>
    ["confirmed", "completed", "email_failed"].includes(row.status),
  );

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 pb-24 md:pb-8">
      <PageHeader
        title="PT Desk"
        subtitle="Assigned clients, session requests, and escalated support."
      />

      {loading && <div className="text-sm text-slate-400">Loading PT desk...</div>}

      {!loading && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <Metric
              label="Assigned clients"
              value={customers.length}
              icon={<Dumbbell className="size-5" />}
            />
            <Metric
              label="Guest meetings"
              value={activeGuestMeetings.length}
              icon={<UserPlus className="size-5" />}
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

          <section className="mb-6 rounded-2xl border border-white/10 bg-[#111612] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Public PT services</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Choose the services you offer and keep your public PT profile clear.
                </p>
              </div>
              <Button disabled={busy} onClick={savePtServices}>
                Save services
              </Button>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-2">
                {services.map((service) => (
                  <label
                    key={service.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.05] px-3 py-2 text-sm text-slate-200"
                  >
                    <span>
                      {service.nameEn}
                      <span className="ml-2 text-xs text-slate-500">
                        {service.priceVnd.toLocaleString("en-US")} VND
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedServiceIds.includes(service.id)}
                      onChange={(event) =>
                        setSelectedServiceIds((ids) =>
                          event.target.checked
                            ? [...ids, service.id]
                            : ids.filter((id) => id !== service.id),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="grid gap-2">
                <Input
                  placeholder="Public bio"
                  value={ptBio}
                  onChange={(event) => setPtBio(event.target.value)}
                />
                <Input
                  placeholder="Specialties"
                  value={ptSpecialties}
                  onChange={(event) => setPtSpecialties(event.target.value)}
                />
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">Guest meeting requests</h2>
              <div className="space-y-3">
                {activeGuestMeetings.length === 0 && (
                  <div className="text-sm text-slate-400">No guest meetings assigned.</div>
                )}
                {activeGuestMeetings.map((meeting) => {
                  const canSendLogin =
                    meeting.status === "completed" ||
                    (meeting.status === "email_failed" && Boolean(meeting.createdUserId));
                  return (
                    <div key={meeting.id} className="rounded-xl bg-white/[0.05] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-slate-100">
                            {meeting.guestName}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            {meeting.status.toUpperCase()} - {formatDate(meeting.scheduledAt)}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            {meeting.guestEmail} - {meeting.guestPhone}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {meeting.status !== "completed" && (
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                guestAction(
                                  { id: meeting.id, action: "complete" },
                                  "Guest meeting completed",
                                )
                              }
                            >
                              Complete
                            </Button>
                          )}
                          {canSendLogin && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                guestAction(
                                  { id: meeting.id, action: "send-login" },
                                  "Login email sent",
                                )
                              }
                            >
                              Send login
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-lg bg-white/[0.06] px-2 py-1 text-slate-300">
                          {meeting.goal}
                        </span>
                        <span className="rounded-lg bg-white/[0.06] px-2 py-1 text-slate-300">
                          {meeting.experience}
                        </span>
                        {meeting.usedFallback === 1 && (
                          <span className="rounded-lg bg-primary/15 px-2 py-1 text-primary">
                            Fallback assignment
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">Unavailable days</h2>
              <form onSubmit={addUnavailableDay} className="flex gap-2">
                <Input
                  type="date"
                  value={unavailableDate}
                  onChange={(e) => setUnavailableDate(e.target.value)}
                  className="h-10"
                />
                <Button type="submit" disabled={busy || !unavailableDate} size="sm">
                  <CalendarOff className="mr-2 size-4" strokeWidth={1.8} />
                  Add
                </Button>
              </form>
              <div className="mt-4 rounded-xl bg-white/[0.05] p-3">
                <div className="mb-2 text-sm font-medium text-slate-100">Excel import</div>
                <Input
                  type="file"
                  accept=".xlsx"
                  onChange={(event) => previewUnavailableImport(event.target.files?.[0] ?? null)}
                />
                {importPreview.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs text-slate-400">
                      {importPreview.filter((row) => row.valid && !row.duplicate).length} ready /{" "}
                      {importPreview.filter((row) => row.duplicate).length} duplicates
                    </div>
                    {importPreview.slice(0, 5).map((row, index) => (
                      <div key={`${row.unavailableDate}-${index}`} className="text-xs text-slate-300">
                        {row.unavailableDate} -{" "}
                        {row.valid ? (row.duplicate ? "duplicate" : "ready") : row.errors.join(", ")}
                      </div>
                    ))}
                    <Button size="sm" disabled={busy} onClick={confirmUnavailableImport}>
                      Confirm import
                    </Button>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {unavailableDays.length === 0 && (
                  <div className="text-sm text-slate-400">No unavailable days set.</div>
                )}
                {unavailableDays.slice(0, 8).map((day) => (
                  <div
                    key={day.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.05] px-3 py-2"
                  >
                    <div className="text-sm text-slate-200">{day.unavailableDate}</div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => removeUnavailableDay(day.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,1fr]">
            <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">Session requests</h2>
              <div className="space-y-3">
                {activeBookings.length === 0 && (
                  <div className="text-sm text-slate-400">No active PT bookings.</div>
                )}
                {activeBookings.map((booking) => (
                  <div key={booking.id} className="rounded-xl bg-white/[0.05] p-4">
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

            <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">Escalated support</h2>
              <div className="space-y-3">
                {activeTickets.length === 0 && (
                  <div className="text-sm text-slate-400">No assigned support tickets.</div>
                )}
                {activeTickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-xl bg-white/[0.05] p-4">
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

          <section className="mt-6 rounded-2xl border border-white/10 bg-[#111612] p-5">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">Assigned clients</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {customers.length === 0 && (
                <div className="text-sm text-slate-400">No clients assigned yet.</div>
              )}
              {customers.map((customer) => (
                <div key={customer.id} className="rounded-xl bg-white/[0.05] p-4">
                  <div className="text-sm font-medium text-slate-100">{customer.displayName}</div>
                  <div className="text-xs text-slate-400">{customer.email}</div>
                  <div className="mt-2 text-xs text-primary">
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
    <div className="rounded-2xl border border-white/10 bg-[#111612] p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-slate-100">{value}</div>
        </div>
        <div className="grid size-10 place-items-center rounded-2xl bg-primary/15 text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.includes(",") ? value.split(",").pop() ?? "" : value);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}
