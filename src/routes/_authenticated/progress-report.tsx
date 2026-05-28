import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { CalendarDays, LineChart, Trophy } from "lucide-react";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/progress-report")({
  head: () => ({ meta: [{ title: "Progress Report — HL Fitness" }] }),
  component: ProgressReport,
});
type WorkoutLog = {
  id: string;
  performedAt: string;
  sets: number | null;
  reps: string | null;
  weightKg: number | null;
};

type Metrics = {
  label: string;
  startDate: string;
  endDate: string;
  totalSessions: number;
  streakDays: number;
  totalVolume: number;
};

type StatScales = {
  sessions: number;
  streak: number;
  volume: number;
};

const parseYmd = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

const formatYmd = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const parseReps = (value: string | null) => {
  if (!value) return null;
  const nums =
    value
      .match(/\d+(?:\.\d+)?/g)
      ?.map(Number)
      .filter(Number.isFinite) ?? [];
  if (nums.length === 0) return null;
  if (nums.length === 1) return nums[0] ?? null;
  return (nums[0] + nums[1]) / 2;
};

const calculateMetrics = (logs: WorkoutLog[], label: string, startDate: Date, endDate: Date) => {
  const uniqueDates = new Set(logs.map((log) => log.performedAt));
  const sortedDates = Array.from(uniqueDates).sort();
  let streakDays = 0;
  if (sortedDates.length > 0) {
    let cursor = parseYmd(sortedDates[sortedDates.length - 1]);
    while (uniqueDates.has(formatYmd(cursor))) {
      streakDays += 1;
      cursor = addDays(cursor, -1);
    }
  }
  const totalVolume = logs.reduce((sum, log) => {
    const sets = log.sets ?? 0;
    const weight = log.weightKg ?? 0;
    const reps = parseReps(log.reps) ?? 0;
    if (!sets || !weight || !reps) return sum;
    return sum + sets * reps * weight;
  }, 0);

  return {
    label,
    startDate: formatYmd(startDate),
    endDate: formatYmd(endDate),
    totalSessions: uniqueDates.size,
    streakDays,
    totalVolume,
  } satisfies Metrics;
};

function ProgressReport() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/log/workout?limit=5000", { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  }, []);

  useEffect(() => {
    load()
      .then((data) => setLogs(data ?? []))
      .finally(() => setLoading(false));
  }, [load]);

  const reports = useMemo(() => {
    if (!logs.length) return null;
    const today = new Date();
    const endOfWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const lastWeekStart = addDays(endOfWeek, -6);
    const earliest = logs.reduce(
      (min, log) => {
        const current = parseYmd(log.performedAt);
        return current < min ? current : min;
      },
      parseYmd(logs[0]?.performedAt ?? formatYmd(endOfWeek)),
    );
    const firstWeekStart = earliest;
    const firstWeekEnd = addDays(firstWeekStart, 6);

    const inRange = (log: WorkoutLog, start: Date, end: Date) => {
      const date = parseYmd(log.performedAt);
      return date >= start && date <= end;
    };

    const lastWeekLogs = logs.filter((log) => inRange(log, lastWeekStart, endOfWeek));
    const firstWeekLogs = logs.filter((log) => inRange(log, firstWeekStart, firstWeekEnd));

    const lastWeek = calculateMetrics(lastWeekLogs, "Last 7 days", lastWeekStart, endOfWeek);
    const firstWeek = calculateMetrics(firstWeekLogs, "First 7 days", firstWeekStart, firstWeekEnd);

    return { lastWeek, firstWeek };
  }, [logs]);

  const scales = useMemo<StatScales | null>(() => {
    if (!reports) return null;
    return {
      sessions: Math.max(reports.lastWeek.totalSessions, reports.firstWeek.totalSessions, 1),
      streak: Math.max(reports.lastWeek.streakDays, reports.firstWeek.streakDays, 1),
      volume: Math.max(reports.lastWeek.totalVolume, reports.firstWeek.totalVolume, 1),
    };
  }, [reports]);

  const deltas = useMemo(() => {
    if (!reports) return null;
    return {
      sessions: reports.lastWeek.totalSessions - reports.firstWeek.totalSessions,
      streak: reports.lastWeek.streakDays - reports.firstWeek.streakDays,
      volume: reports.lastWeek.totalVolume - reports.firstWeek.totalVolume,
    };
  }, [reports]);

  const formatVolume = (value: number) => Math.round(value).toLocaleString("en-US");
  const formatDelta = (value: number, suffix: string) => {
    const rounded = Math.round(value);
    const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
    return `${sign}${Math.abs(rounded)}${suffix}`;
  };

  const deltaTone = (value: number) => {
    if (value > 0) return "up";
    if (value < 0) return "down";
    return "flat";
  };

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8 pb-24 md:pb-8">
      <PageHeader
        title="Progress Report"
        subtitle="Auto-calculated from your workout log entries each week."
      />

      {loading && <div className="text-sm text-slate-400">Loading progress...</div>}

      {!loading && logs.length === 0 && (
        <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur p-8 text-center">
          <div className="text-lg font-semibold text-slate-100">No workouts yet</div>
          <p className="text-sm text-slate-400 mt-2">
            Log your first workout and this page will build your weekly progress automatically.
          </p>
          <Button asChild className="mt-4 bg-yellow-400 text-yellow-950 hover:bg-yellow-300">
            <Link to="/log/workout">Log a workout</Link>
          </Button>
        </div>
      )}

      {!loading && reports && scales && deltas && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <ReportCard
              icon={<LineChart className="size-5" />}
              accent="bg-yellow-400/15 text-yellow-200"
              barClass="from-yellow-500/40 via-yellow-400/25 to-transparent"
              metrics={reports.lastWeek}
              scales={scales}
              formatVolume={formatVolume}
            />
            <ReportCard
              icon={<CalendarDays className="size-5" />}
              accent="bg-emerald-400/15 text-emerald-200"
              barClass="from-emerald-500/40 via-emerald-400/25 to-transparent"
              metrics={reports.firstWeek}
              scales={scales}
              formatVolume={formatVolume}
            />
          </div>

          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-black/40 to-blue-400/10 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-2xl bg-blue-400/15 text-blue-200 grid place-items-center">
                <Trophy className="size-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100">Momentum check</div>
                <div className="text-xs text-slate-400">Last week vs your first week</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
              <DeltaStat
                label="Sessions"
                value={formatDelta(deltas.sessions, "")}
                tone={deltaTone(deltas.sessions)}
              />
              <DeltaStat
                label="Streak"
                value={formatDelta(deltas.streak, "d")}
                tone={deltaTone(deltas.streak)}
              />
              <DeltaStat
                label="Volume"
                value={formatDelta(deltas.volume, " kg")}
                tone={deltaTone(deltas.volume)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportCard({
  metrics,
  icon,
  accent,
  barClass,
  scales,
  formatVolume,
}: {
  metrics: Metrics;
  icon: ReactNode;
  accent: string;
  barClass: string;
  scales: StatScales;
  formatVolume: (value: number) => string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-black/40 to-black/60 p-[1px]">
      <div className="rounded-3xl bg-black/55 backdrop-blur p-5 sm:p-6 shadow-[0_30px_70px_-50px_rgba(250,204,21,0.35)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-300">
              {metrics.label}
            </div>
            <div className="text-base sm:text-lg font-semibold text-slate-100 mt-3 leading-tight">
              {formatDate(metrics.startDate)} - {formatDate(metrics.endDate)}
            </div>
          </div>
          <div className={`size-10 rounded-2xl grid place-items-center ${accent}`}>{icon}</div>
        </div>

        <div className="mt-5 space-y-3">
          <StatRow
            label="Sessions"
            value={metrics.totalSessions}
            suffix=""
            max={scales.sessions}
            barClass={barClass}
          />
          <StatRow
            label="Streak"
            value={metrics.streakDays}
            suffix="d"
            max={scales.streak}
            barClass={barClass}
          />
          <StatRow
            label="Volume"
            value={metrics.totalVolume}
            suffix=" kg"
            max={scales.volume}
            barClass={barClass}
            formatter={formatVolume}
          />
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  suffix,
  max,
  barClass,
  formatter,
}: {
  label: string;
  value: number;
  suffix: string;
  max: number;
  barClass: string;
  formatter?: (value: number) => string;
}) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const width = value > 0 ? Math.max(ratio * 100, 14) : 0;
  const displayValue = formatter ? formatter(value) : Math.round(value).toString();
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="absolute inset-y-0 left-0 opacity-70">
        <div className={`h-full bg-gradient-to-r ${barClass}`} style={{ width: `${width}%` }} />
      </div>
      <div className="relative flex items-center justify-between gap-3">
        <div className="text-[10px] sm:text-xs text-slate-300 uppercase tracking-[0.18em]">
          {label}
        </div>
        <div className="text-base sm:text-lg font-semibold text-slate-100">
          {displayValue}
          {suffix}
        </div>
      </div>
    </div>
  );
}

function DeltaStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "up" | "down" | "flat";
}) {
  const toneClasses =
    tone === "up"
      ? "bg-emerald-400/10 text-emerald-200"
      : tone === "down"
        ? "bg-rose-400/10 text-rose-200"
        : "bg-white/5 text-slate-200";
  return (
    <div className={`rounded-2xl border border-white/10 p-4 ${toneClasses}`}>
      <div className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-slate-300">
        {label}
      </div>
      <div className="text-lg font-semibold mt-2">{value}</div>
    </div>
  );
}
