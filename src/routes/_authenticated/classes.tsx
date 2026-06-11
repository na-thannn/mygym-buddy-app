import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Loader2, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/authContext";
import { buildClassDiscovery, type ClassDiscoveryItem } from "@/lib/customer-experience";
import { canManageGroupClasses } from "@/lib/group-classes";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/classes")({
  head: () => ({ meta: [{ title: "Classes - HL Fitness" }] }),
  component: ClassesPage,
});

type ClassDef = {
  id: string;
  title: string;
  description?: string | null;
  level?: string | null;
};

type ClassSession = {
  sessionId: string;
  classId: string;
  title: string;
  description?: string | null;
  level?: string | null;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  status: string;
  bookedCount: number;
  seatsLeft: number;
  myBooking?: { id: string; status: string } | null;
};

type Enrollment = {
  id: string;
  sessionId: string;
  customerName: string;
  customerEmail: string;
  status: string;
};

function ClassesPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [classes, setClasses] = useState<ClassDef[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/classes", { credentials: "include" });
      if (!res.ok) throw new Error("Unable to load classes");
      const body = await res.json();
      setSessions(body.sessions ?? []);
      setClasses(body.classes ?? []);
      setEnrollments(body.enrollments ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load classes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitAction = async (
    body: Record<string, unknown>,
    success: string,
    actionKey = String(body.action ?? "class-action"),
  ) => {
    setBusyKey(actionKey);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
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
      setBusyKey(null);
    }
  };

  const enrollmentsBySession = useMemo(() => {
    const map = new Map<string, Enrollment[]>();
    for (const row of enrollments) {
      const rows = map.get(row.sessionId) ?? [];
      rows.push(row);
      map.set(row.sessionId, rows);
    }
    return map;
  }, [enrollments]);

  const discovery = useMemo(
    () => buildClassDiscovery({ nowIso: new Date().toISOString(), sessions }),
    [sessions],
  );

  if (!user) return null;
  const canManage = canManageGroupClasses({ userId: user.id, role: user.role });
  const adminBusy = Boolean(busyKey);

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 md:p-8">
      <PageHeader
        title="Group Classes"
        subtitle="Find upcoming sessions, see capacity, and keep booked classes easy to spot."
      />

      {user.role === "admin" && (
        <details className="mb-6 rounded-2xl border border-white/10 bg-[#111612] p-5">
          <summary className="cursor-pointer text-sm font-semibold text-slate-100">
            Admin class tools
          </summary>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <CreateClassForm busy={adminBusy} onSubmit={submitAction} />
            <ScheduleClassForm busy={adminBusy} classes={classes} onSubmit={submitAction} />
          </div>
        </details>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-[#111612] p-6 text-sm text-slate-400">
          <Loader2 className="mr-2 inline size-4 animate-spin" />
          Loading classes
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          title="No group classes scheduled"
          detail="Check back after managers add sessions."
        />
      ) : user.role === "customer" ? (
        <div className="space-y-8">
          <ClassSection
            title="Booked"
            detail="Your upcoming class sessions."
            sessions={discovery.bookedUpcoming}
            busyKey={busyKey}
            onAction={submitAction}
            mode="booked"
          />
          <ClassSection
            title="Discover classes"
            detail="Available upcoming sessions sorted by start time."
            sessions={discovery.availableUpcoming}
            busyKey={busyKey}
            onAction={submitAction}
            mode="available"
          />
          {discovery.unavailable.length > 0 && (
            <ClassSection
              title="Full or unavailable"
              detail="These sessions are visible but cannot be booked right now."
              sessions={discovery.unavailable}
              busyKey={busyKey}
              onAction={submitAction}
              mode="unavailable"
            />
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sessions.map((session) => (
            <ManagedClassCard
              key={session.sessionId}
              session={session}
              rows={enrollmentsBySession.get(session.sessionId) ?? []}
              canManage={canManage}
              busyKey={busyKey}
              onAction={submitAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClassSection({
  title,
  detail,
  sessions,
  busyKey,
  onAction,
  mode,
}: {
  title: string;
  detail: string;
  sessions: ClassDiscoveryItem[];
  busyKey: string | null;
  onAction: (body: Record<string, unknown>, success: string, actionKey?: string) => Promise<void>;
  mode: "booked" | "available" | "unavailable";
}) {
  return (
    <section>
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-100">{title}</h2>
          <p className="mt-1 text-sm text-slate-400">{detail}</p>
        </div>
        <span className="text-xs text-slate-500">
          {sessions.length} session{sessions.length === 1 ? "" : "s"}
        </span>
      </div>
      {sessions.length === 0 ? (
        <EmptyState
          title={mode === "booked" ? "No booked classes" : "No sessions in this group"}
          detail={
            mode === "booked"
              ? "Book a class below and it will stay pinned here."
              : "Try another day or check back when managers publish more sessions."
          }
          compact
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sessions.map((session) => (
            <CustomerClassCard
              key={session.sessionId}
              session={session}
              busyKey={busyKey}
              onAction={onAction}
              mode={mode}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function CustomerClassCard({
  session,
  busyKey,
  onAction,
  mode,
}: {
  session: ClassDiscoveryItem;
  busyKey: string | null;
  onAction: (body: Record<string, unknown>, success: string, actionKey?: string) => Promise<void>;
  mode: "booked" | "available" | "unavailable";
}) {
  const bookKey = `book-${session.sessionId}`;
  const cancelKey = `cancel-${session.myBooking?.id ?? session.sessionId}`;
  const actionBusy = busyKey === bookKey || busyKey === cancelKey;

  return (
    <article className="rounded-2xl border border-white/10 bg-[#111612] p-5 shadow-[0_25px_60px_-55px_rgba(0,0,0,0.8)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-100">{session.title}</h3>
            {session.isBooked && (
              <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[11px] text-emerald-200">
                Booked
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
            <Chip icon={CalendarDays}>{formatDate(session.startsAt)}</Chip>
            <Chip icon={Clock}>{session.durationMinutes} min</Chip>
            {session.level && <Chip>{session.level}</Chip>}
          </div>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
          <CalendarDays className="size-5" />
        </div>
      </div>

      {session.description && (
        <p className="mt-4 text-sm leading-6 text-slate-300">{session.description}</p>
      )}

      <CapacityMeter session={session} />

      <div className="mt-5">
        {mode === "booked" ? (
          <Button
            variant="outline"
            disabled={actionBusy}
            className="w-full border-white/10 text-slate-200 hover:text-primary"
            onClick={() =>
              onAction(
                { action: "cancel-booking", bookingId: session.myBooking?.id },
                "Class booking cancelled",
                cancelKey,
              )
            }
          >
            {actionBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Cancel booking
          </Button>
        ) : mode === "available" ? (
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={actionBusy || session.seatsLeft <= 0}
            onClick={() =>
              onAction(
                { action: "book-session", sessionId: session.sessionId },
                "Class booked",
                bookKey,
              )
            }
          >
            {actionBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Book class
          </Button>
        ) : (
          <Button variant="outline" disabled className="w-full">
            {session.capacityLabel}
          </Button>
        )}
      </div>
    </article>
  );
}

function ManagedClassCard({
  session,
  rows,
  canManage,
  busyKey,
  onAction,
}: {
  session: ClassSession;
  rows: Enrollment[];
  canManage: boolean;
  busyKey: string | null;
  onAction: (body: Record<string, unknown>, success: string, actionKey?: string) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111612] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-slate-100">{session.title}</div>
          <div className="mt-1 text-sm text-slate-400">{formatDate(session.startsAt)}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full bg-white/10 px-2 py-1">
              {session.durationMinutes} min
            </span>
            <span className="rounded-full bg-white/10 px-2 py-1">
              {session.seatsLeft} / {session.capacity} seats left
            </span>
            {session.level && (
              <span className="rounded-full bg-primary/15 px-2 py-1 text-primary">
                {session.level}
              </span>
            )}
          </div>
        </div>
        <div className="grid size-10 place-items-center rounded-2xl bg-primary/15 text-primary">
          <CalendarDays className="size-5" />
        </div>
      </div>

      {session.description && <p className="mt-3 text-sm text-slate-300">{session.description}</p>}

      {canManage && rows.length > 0 && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-100">
            <Users className="size-4" />
            Attendance
          </div>
          <div className="space-y-2">
            {rows.map((row) => {
              const presentKey = `present-${row.id}`;
              const noShowKey = `noshow-${row.id}`;
              return (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.05] p-3"
                >
                  <div>
                    <div className="text-sm text-slate-100">{row.customerName}</div>
                    <div className="text-xs text-slate-400">{row.customerEmail}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{row.status}</span>
                    <Button
                      size="sm"
                      disabled={busyKey === presentKey}
                      onClick={() =>
                        onAction(
                          { action: "mark-attendance", bookingId: row.id, attended: true },
                          "Attendance marked",
                          presentKey,
                        )
                      }
                    >
                      {busyKey === presentKey && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Present
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyKey === noShowKey}
                      onClick={() =>
                        onAction(
                          { action: "mark-attendance", bookingId: row.id, attended: false },
                          "No-show marked",
                          noShowKey,
                        )
                      }
                    >
                      No-show
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CapacityMeter({ session }: { session: ClassDiscoveryItem }) {
  const tone =
    session.capacityTone === "booked"
      ? "bg-emerald-300"
      : session.capacityTone === "full"
        ? "bg-rose-300"
        : session.capacityTone === "tight"
          ? "bg-amber-300"
          : "bg-primary";
  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="text-slate-400">Capacity</span>
        <span className="font-medium text-slate-100">{session.capacityLabel}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${session.capacityPercent}%` }}
        />
      </div>
      <div className="mt-2 text-[11px] text-slate-500">
        {session.bookedCount} booked out of {session.capacity}
      </div>
    </div>
  );
}

function Chip({ icon: Icon, children }: { icon?: typeof CalendarDays; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
      {Icon && <Icon className="size-3.5" />}
      {children}
    </span>
  );
}

function EmptyState({
  title,
  detail,
  compact = false,
}: {
  title: string;
  detail: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-white/10 bg-[#111612] text-center ${
        compact ? "p-5" : "p-8"
      }`}
    >
      <CheckCircle2 className="mx-auto mb-3 size-6 text-slate-500" />
      <div className="text-sm font-medium text-slate-100">{title}</div>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
}

function CreateClassForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (body: Record<string, unknown>, success: string, actionKey?: string) => Promise<void>;
}) {
  return (
    <form
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        await onSubmit(
          {
            action: "create-class",
            title: String(fd.get("title") ?? ""),
            description: String(fd.get("description") ?? ""),
            level: String(fd.get("level") ?? ""),
          },
          "Class created",
          "create-class",
        );
        e.currentTarget.reset();
      }}
    >
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Create class</h2>
      <div className="grid gap-3">
        <Field label="Name">
          <Input name="title" required placeholder="Strength Foundations" />
        </Field>
        <Field label="Level">
          <Input name="level" placeholder="Beginner" />
        </Field>
        <Field label="Description">
          <Textarea name="description" rows={3} />
        </Field>
        <Button disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
          Create
        </Button>
      </div>
    </form>
  );
}

function ScheduleClassForm({
  busy,
  classes,
  onSubmit,
}: {
  busy: boolean;
  classes: ClassDef[];
  onSubmit: (body: Record<string, unknown>, success: string, actionKey?: string) => Promise<void>;
}) {
  return (
    <form
      className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        await onSubmit(
          {
            action: "schedule-session",
            classId: String(fd.get("classId") ?? ""),
            startsAt: new Date(String(fd.get("startsAt") ?? "")).toISOString(),
            durationMinutes: Number(fd.get("durationMinutes") ?? 60),
            capacity: Number(fd.get("capacity") ?? 12),
          },
          "Class session scheduled",
          "schedule-session",
        );
        e.currentTarget.reset();
      }}
    >
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Schedule session</h2>
      {classes.length === 0 ? (
        <div className="text-sm text-slate-400">Create a class before scheduling sessions.</div>
      ) : (
        <div className="grid gap-3">
          <Field label="Class">
            <select
              name="classId"
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Date & time">
              <Input name="startsAt" type="datetime-local" required />
            </Field>
            <Field label="Duration">
              <Input name="durationMinutes" type="number" defaultValue={60} min={15} max={240} />
            </Field>
            <Field label="Capacity">
              <Input name="capacity" type="number" defaultValue={12} min={1} max={100} />
            </Field>
          </div>
          <Button
            disabled={busy}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Schedule
          </Button>
        </div>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
