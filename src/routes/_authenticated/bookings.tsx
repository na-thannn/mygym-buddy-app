import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/authContext";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({ meta: [{ title: "Bookings — HL Fitness" }] }),
  component: BookingsPage,
});

type Row = {
  id: string;
  customerId: string;
  ptId?: string | null;
  status: string;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string | null;
};

type PtOption = {
  id: string;
  displayName: string;
  email: string;
};

function BookingsPage() {
  const { user } = useAuth();
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

  const [rows, setRows] = useState<Row[]>([]);
  const [scheduledAtLocal, setScheduledAtLocal] = useState<string>("");
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState<string>("");
  const [ptId, setPtId] = useState<string>("auto");
  const [pts, setPts] = useState<PtOption[]>([]);

  const load = useCallback(async () => setRows(await list()), [list]);
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
    try {
      // convert local datetime-local string to ISO
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
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader title="Bookings" subtitle="Request a PT session or view your bookings." />

      {user?.role === "customer" && (
        <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-black/40 p-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Date & time</Label>
              <Input
                type="datetime-local"
                value={scheduledAtLocal}
                onChange={(e) => setScheduledAtLocal(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-1 mt-3">
            <Label>Preferred PT</Label>
            <select
              value={ptId}
              onChange={(e) => setPtId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="auto">Use assigned or first available</option>
              {pts.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.displayName} ({pt.email})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 mt-3">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="mt-3">
            <Button type="submit" className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300">
              Request booking
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="text-sm text-slate-400 text-center py-10">No bookings yet.</div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="font-medium text-sm text-slate-100">{r.status.toUpperCase()}</div>
            <div className="text-xs text-slate-400">
              {formatDate(r.scheduledAt)} • {r.durationMinutes} min
            </div>
            {r.notes && <div className="text-xs mt-1 italic text-slate-300">{r.notes}</div>}
            {user?.role === "customer" &&
              ["pending", "confirmed", "rescheduled"].includes(r.status) && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-3 text-rose-300"
                  onClick={() => cancelBooking(r.id)}
                >
                  Cancel booking
                </Button>
              )}
          </div>
        ))}
      </div>
    </div>
  );
}
