import { useMemo, useState } from "react";
import { CalendarOff, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";

export type PtAvailabilityBlock = {
  id: string;
  ptId: string;
  unavailableDate: string;
  allDay: number | boolean;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
};

type PtOption = {
  id: string;
  displayName: string;
};

type PtAvailabilityConflict = {
  type: "booking" | "guest_meeting" | "class_session";
  id: string;
  title: string;
  startsAt: string;
};

type PtAvailabilityCalendarProps = {
  title: string;
  blocks: PtAvailabilityBlock[];
  pts?: PtOption[];
  selectedPtId?: string;
  onSelectedPtIdChange?: (ptId: string) => void;
  onRefresh: () => Promise<void>;
};

type Mode = "full-day" | "time-block";

export function PtAvailabilityCalendar({
  title,
  blocks,
  pts = [],
  selectedPtId,
  onSelectedPtIdChange,
  onRefresh,
}: PtAvailabilityCalendarProps) {
  const [mode, setMode] = useState<Mode>("full-day");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [blockDate, setBlockDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [conflicts, setConflicts] = useState<PtAvailabilityConflict[]>([]);

  const canSelectPt = Boolean(onSelectedPtIdChange);
  const visibleBlocks = useMemo(
    () => (selectedPtId ? blocks.filter((block) => block.ptId === selectedPtId) : blocks),
    [blocks, selectedPtId],
  );

  const createBlock = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/pt-unavailability-blocks", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload?.error ?? "Unable to save unavailable time");
    return (payload.conflicts ?? []) as PtAvailabilityConflict[];
  };

  const saveFullDays = async () => {
    if (selectedDates.length === 0) return;
    if (canSelectPt && !selectedPtId) {
      toast.error("Select a PT first");
      return;
    }
    setBusy(true);
    try {
      const allConflicts: PtAvailabilityConflict[] = [];
      for (const date of selectedDates) {
        const nextConflicts = await createBlock({
          ptId: selectedPtId,
          unavailableDate: dateToYmd(date),
          allDay: true,
          reason: reason.trim() || undefined,
        });
        allConflicts.push(...nextConflicts);
      }
      setSelectedDates([]);
      setReason("");
      setConflicts(allConflicts);
      toast.success(`Saved ${selectedDates.length} unavailable day${selectedDates.length === 1 ? "" : "s"}`);
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save unavailable days");
    } finally {
      setBusy(false);
    }
  };

  const saveTimeBlock = async () => {
    if (!blockDate) return;
    if (canSelectPt && !selectedPtId) {
      toast.error("Select a PT first");
      return;
    }
    setBusy(true);
    try {
      const nextConflicts = await createBlock({
        ptId: selectedPtId,
        unavailableDate: dateToYmd(blockDate),
        allDay: false,
        startTime,
        endTime,
        reason: reason.trim() || undefined,
      });
      setBlockDate(undefined);
      setReason("");
      setConflicts(nextConflicts);
      toast.success("Unavailable time saved");
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save unavailable time");
    } finally {
      setBusy(false);
    }
  };

  const removeBlock = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/pt-unavailability-blocks", {
        method: "DELETE",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Unable to remove unavailable time");
      setConflicts([]);
      toast.success("Unavailable time removed");
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to remove unavailable time");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-[#111612] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        <div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
          <Button
            type="button"
            size="sm"
            variant={mode === "full-day" ? "default" : "ghost"}
            className="rounded-lg"
            onClick={() => setMode("full-day")}
          >
            <CalendarOff className="mr-2 size-4" strokeWidth={1.8} />
            Full day
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "time-block" ? "default" : "ghost"}
            className="rounded-lg"
            onClick={() => setMode("time-block")}
          >
            <Clock className="mr-2 size-4" strokeWidth={1.8} />
            Time block
          </Button>
        </div>
      </div>

      {canSelectPt && (
        <select
          value={selectedPtId ?? ""}
          onChange={(event) => onSelectedPtIdChange?.(event.target.value)}
          className="mb-4 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Select PT</option>
          {pts.map((pt) => (
            <option key={pt.id} value={pt.id}>
              {pt.displayName}
            </option>
          ))}
        </select>
      )}

      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">
          {mode === "full-day" ? (
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={(dates) => setSelectedDates(dates ?? [])}
              className="bg-transparent text-slate-100"
            />
          ) : (
            <Calendar
              mode="single"
              selected={blockDate}
              onSelect={setBlockDate}
              className="bg-transparent text-slate-100"
            />
          )}
        </div>

        <div className="space-y-4">
          {mode === "time-block" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="h-10"
              />
              <Input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="h-10"
              />
            </div>
          )}
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason"
            className="h-10"
          />
          <Button
            type="button"
            disabled={
              busy ||
              (canSelectPt && !selectedPtId) ||
              (mode === "full-day" ? selectedDates.length === 0 : !blockDate)
            }
            onClick={mode === "full-day" ? saveFullDays : saveTimeBlock}
          >
            <CalendarOff className="mr-2 size-4" strokeWidth={1.8} />
            Save
          </Button>

          {conflicts.length > 0 && (
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
              <div className="text-sm font-medium text-amber-200">Conflicts</div>
              <div className="mt-2 space-y-1">
                {conflicts.slice(0, 4).map((conflict) => (
                  <div key={`${conflict.type}-${conflict.id}`} className="text-xs text-amber-100/90">
                    {conflict.title} - {formatDateTime(conflict.startsAt)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {visibleBlocks.length === 0 && (
          <div className="text-sm text-slate-400">No unavailable time set.</div>
        )}
        {visibleBlocks.slice(0, 10).map((block) => {
          const pt = pts.find((item) => item.id === block.ptId);
          return (
            <div
              key={block.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.05] px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-slate-200">{formatBlock(block)}</div>
                <div className="truncate text-xs text-slate-500">
                  {pt?.displayName ?? block.reason ?? ""}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => removeBlock(block.id)}
              >
                <Trash2 className="mr-2 size-4" strokeWidth={1.8} />
                Remove
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function dateToYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatBlock(block: PtAvailabilityBlock) {
  if (Boolean(block.allDay)) return `${block.unavailableDate} - Full day`;
  return `${block.unavailableDate} - ${block.startTime} to ${block.endTime}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Saigon",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
