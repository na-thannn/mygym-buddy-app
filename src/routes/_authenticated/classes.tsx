import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/authContext";
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
  const [busy, setBusy] = useState(false);

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

  const submitAction = async (body: Record<string, unknown>, success: string) => {
    setBusy(true);
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
      setBusy(false);
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

  if (!user) return null;
  const canManage = canManageGroupClasses({ userId: user.id, role: user.role });

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 pb-24 md:pb-8">
      <PageHeader
        title="Group Classes"
        subtitle="Book sessions, manage attendance, and create scheduled gym classes."
      />

      {loading && <div className="text-sm text-slate-400">Loading classes...</div>}

      {user.role === "admin" && (
        <div className="grid gap-4 lg:grid-cols-2 mb-6">
          <CreateClassForm busy={busy} onSubmit={submitAction} />
          <ScheduleClassForm busy={busy} classes={classes} onSubmit={submitAction} />
        </div>
      )}

      {!loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {sessions.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-slate-400">
              No group classes scheduled yet.
            </div>
          )}

          {sessions.map((session) => {
            const rows = enrollmentsBySession.get(session.sessionId) ?? [];
            const isBooked = session.myBooking?.status === "booked";
            return (
              <div
                key={session.sessionId}
                className="rounded-2xl border border-white/10 bg-black/40 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-slate-100">{session.title}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {formatDate(session.startsAt)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full bg-white/10 px-2 py-1">
                        {session.durationMinutes} min
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-1">
                        {session.seatsLeft} / {session.capacity} seats left
                      </span>
                      {session.level && (
                        <span className="rounded-full bg-yellow-400/15 px-2 py-1 text-yellow-200">
                          {session.level}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid size-10 place-items-center rounded-2xl bg-yellow-400/15 text-yellow-200">
                    <CalendarDays className="size-5" />
                  </div>
                </div>

                {session.description && (
                  <p className="mt-3 text-sm text-slate-300">{session.description}</p>
                )}

                {user.role === "customer" && (
                  <div className="mt-4">
                    {isBooked ? (
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          submitAction(
                            { action: "cancel-booking", bookingId: session.myBooking?.id },
                            "Class booking cancelled",
                          )
                        }
                      >
                        Cancel booking
                      </Button>
                    ) : (
                      <Button
                        className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300"
                        disabled={busy || session.seatsLeft <= 0}
                        onClick={() =>
                          submitAction(
                            { action: "book-session", sessionId: session.sessionId },
                            "Class booked",
                          )
                        }
                      >
                        {session.seatsLeft <= 0 ? "Full" : "Book class"}
                      </Button>
                    )}
                  </div>
                )}

                {canManage && rows.length > 0 && (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-100">
                      <Users className="size-4" />
                      Attendance
                    </div>
                    <div className="space-y-2">
                      {rows.map((row) => (
                        <div
                          key={row.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 p-3"
                        >
                          <div>
                            <div className="text-sm text-slate-100">{row.customerName}</div>
                            <div className="text-xs text-slate-400">{row.customerEmail}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                              {row.status}
                            </span>
                            <Button
                              size="sm"
                              disabled={busy}
                              onClick={() =>
                                submitAction(
                                  { action: "mark-attendance", bookingId: row.id, attended: true },
                                  "Attendance marked",
                                )
                              }
                            >
                              Present
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy}
                              onClick={() =>
                                submitAction(
                                  { action: "mark-attendance", bookingId: row.id, attended: false },
                                  "No-show marked",
                                )
                              }
                            >
                              No-show
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateClassForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  return (
    <form
      className="rounded-2xl border border-white/10 bg-black/40 p-5"
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
        );
        e.currentTarget.reset();
      }}
    >
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Create class</h2>
      <div className="grid gap-3">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input name="title" required placeholder="Strength Foundations" />
        </div>
        <div className="space-y-1">
          <Label>Level</Label>
          <Input name="level" placeholder="Beginner" />
        </div>
        <div className="space-y-1">
          <Label>Description</Label>
          <Textarea name="description" rows={3} />
        </div>
        <Button disabled={busy} className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300">
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
  onSubmit: (body: Record<string, unknown>, success: string) => Promise<void>;
}) {
  return (
    <form
      className="rounded-2xl border border-white/10 bg-black/40 p-5"
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
        );
        e.currentTarget.reset();
      }}
    >
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Schedule session</h2>
      {classes.length === 0 ? (
        <div className="text-sm text-slate-400">Create a class before scheduling sessions.</div>
      ) : (
        <div className="grid gap-3">
          <div className="space-y-1">
            <Label>Class</Label>
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
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1 sm:col-span-1">
              <Label>Date & time</Label>
              <Input name="startsAt" type="datetime-local" required />
            </div>
            <div className="space-y-1">
              <Label>Duration</Label>
              <Input name="durationMinutes" type="number" defaultValue={60} min={15} max={240} />
            </div>
            <div className="space-y-1">
              <Label>Capacity</Label>
              <Input name="capacity" type="number" defaultValue={12} min={1} max={100} />
            </div>
          </div>
          <Button disabled={busy} className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300">
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Schedule
          </Button>
        </div>
      )}
    </form>
  );
}
