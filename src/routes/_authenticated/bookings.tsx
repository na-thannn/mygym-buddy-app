import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Loader2, UserRound } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/authContext";
import { buildBookingExperience, type BookingCoachOption } from "@/lib/customer-experience";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({ meta: [{ title: "Bookings - HL Fitness" }] }),
  component: BookingsPage,
});

type Row = {
  id: string;
  customerId: string;
  ptId?: string | null;
  status: string;
  scheduledAt: string;
  durationMinutes?: number | null;
  notes?: string | null;
};

type PtOption = {
  id: string;
  displayName: string;
  email: string;
};

type BookingListRow = {
  id: string;
  status: string;
  scheduledAt: string;
  durationMinutes?: number | null;
  notes?: string | null;
};

const DURATIONS = [45, 60, 75, 90];

function BookingsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [scheduledAtLocal, setScheduledAtLocal] = useState<string>("");
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState<string>("");
  const [ptId, setPtId] = useState<string>("auto");
  const [pts, setPts] = useState<PtOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const experience = useMemo(
    () =>
      buildBookingExperience({
        nowIso: new Date().toISOString(),
        bookings: rows,
        pts,
      }),
    [pts, rows],
  );

  const list = useCallback(async () => {
    const res = await fetch(`/api/bookings`, { credentials: "include" });
    if (!res.ok) return [] as Row[];
    return res.json();
  }, []);

  const create = async (payload: { data: Record<string, unknown> }) => {
    const res = await fetch(`/api/bookings`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Create failed");
    }
    return res.json();
  };

  const cancelBooking = async (id: string) => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      const res = await fetch(`/api/bookings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, action: "cancel" }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error ?? "Cancel failed");
      }
      toast.success("Booking cancelled");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await list());
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/pts", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { pts: [] }))
      .then((body) => setPts(body.pts ?? []))
      .catch(() => setPts([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAtLocal) {
      toast.error("Pick date and time");
      return;
    }
    setBusy(true);
    try {
      const iso = new Date(scheduledAtLocal).toISOString();
      await create({
        data: {
          scheduledAt: iso,
          durationMinutes: duration,
          notes,
          ptId: ptId === "auto" ? null : ptId,
        },
      });
      toast.success("Booking requested");
      setScheduledAtLocal("");
      setNotes("");
      setPtId("auto");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 md:p-8">
      <PageHeader
        title="Bookings"
        subtitle="Request a PT session and keep your next coaching commitment visible."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.86fr]">
        {user?.role === "customer" && (
          <form
            onSubmit={submit}
            className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 animate-fade-up"
          >
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <CalendarDays className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-stone-50">
                  Request a PT session
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-stone-400">
                  Pick a time, choose a coach preference, and add what you want to work on.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Date and time</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAtLocal}
                  onChange={(e) => setScheduledAtLocal(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATIONS.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => setDuration(minutes)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        duration === minutes
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-white/10 bg-white/[0.04] text-stone-300 hover:bg-white/[0.08]",
                      )}
                    >
                      {minutes}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <Label>Coach preference</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {experience.coachOptions.map((coach) => (
                  <CoachOptionCard
                    key={coach.id}
                    coach={coach}
                    active={ptId === coach.id}
                    onClick={() => setPtId(coach.id)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-1.5">
              <Label>Session notes</Label>
              <Textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Technique check, strength goal, soreness, preferred focus"
              />
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm leading-6 text-stone-400">
                Requests stay pending until a manager or your PT confirms the time.
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Request booking
              </Button>
            </div>
          </form>
        )}

        <aside className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 shadow-[0_28px_80px_-62px_rgba(244,179,43,0.75)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-primary">Next session</div>
                {experience.nextBooking ? (
                  <>
                    <h2 className="mt-2 text-2xl font-semibold text-stone-50">
                      {formatDate(experience.nextBooking.scheduledAt)}
                    </h2>
                    <p className="mt-2 text-sm text-stone-400">
                      {experience.nextBooking.durationMinutes ?? 60} min,{" "}
                      {experience.nextBooking.status}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-2 text-2xl font-semibold text-stone-50">No session booked</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-400">
                      Request a time to create your next coaching anchor.
                    </p>
                  </>
                )}
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
                <Clock className="size-5" />
              </div>
            </div>
          </div>

          <BookingList
            title="Upcoming"
            loading={loading}
            rows={experience.upcoming}
            empty="No upcoming bookings yet."
            onCancel={user?.role === "customer" ? cancelBooking : undefined}
          />

          <BookingList
            title="History"
            loading={loading}
            rows={experience.history}
            empty="Completed and cancelled bookings appear here."
          />
        </aside>
      </div>
    </div>
  );
}

function CoachOptionCard({
  coach,
  active,
  onClick,
}: {
  coach: BookingCoachOption;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active
          ? "border-primary bg-primary/12"
          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <UserRound className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-semibold text-stone-50">{coach.label}</div>
            {active && <CheckCircle2 className="size-4 text-primary" />}
          </div>
          <div className="mt-1 line-clamp-2 text-xs leading-5 text-stone-400">{coach.detail}</div>
        </div>
      </div>
    </button>
  );
}

function BookingList({
  title,
  loading,
  rows,
  empty,
  onCancel,
}: {
  title: string;
  loading: boolean;
  rows: BookingListRow[];
  empty: string;
  onCancel?: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111612]/95 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-stone-50">{title}</h2>
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-stone-400">
          {rows.length}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] p-4 text-sm text-stone-400">
          <Loader2 className="size-4 animate-spin" />
          Loading bookings
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-stone-400">
          {empty}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((booking) => (
            <article
              key={booking.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-stone-50">
                    {formatDate(booking.scheduledAt)}
                  </div>
                  <div className="mt-1 text-xs text-stone-400">
                    {booking.durationMinutes ?? 60} min, {booking.status}
                  </div>
                </div>
                <span className="rounded-lg bg-primary/15 px-2 py-1 text-xs font-medium text-primary">
                  {booking.status}
                </span>
              </div>
              {booking.notes && (
                <div className="mt-3 rounded-lg bg-black/20 p-3 text-xs leading-5 text-stone-300">
                  {booking.notes}
                </div>
              )}
              {onCancel && ["pending", "confirmed", "rescheduled"].includes(booking.status) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-3 rounded-xl text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                  onClick={() => onCancel(booking.id)}
                >
                  Cancel booking
                </Button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
