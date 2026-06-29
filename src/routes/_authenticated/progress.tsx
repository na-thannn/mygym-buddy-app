import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Calendar,
  Camera,
  ChevronRight,
  ImagePlus,
  LineChart,
  Loader2,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Utensils,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { buildProgressExperience, type ProgressExperience } from "@/lib/customer-experience";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Progress - HL Fitness" }] }),
  component: Progress,
});

type PhotoRow = {
  imageBase64: string;
};

type WorkoutRow = {
  performedAt: string;
  sets?: number | null;
  reps?: string | null;
  weightKg?: number | null;
};

type NutritionRow = {
  reportDate: string;
};

type InbodyRow = {
  reportDate: string;
  weightKg: number;
  muscleMassKg: number;
  bodyFatPercent: number;
};

function Progress() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [nutritionReports, setNutritionReports] = useState<NutritionRow[]>([]);
  const [inbodyReports, setInbodyReports] = useState<InbodyRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const summary = useMemo(
    () =>
      buildProgressExperience({
        today: new Date().toISOString().slice(0, 10),
        workouts,
        inbodyReports,
        nutritionReports,
        photoCount: photos.length,
      }),
    [inbodyReports, nutritionReports, photos.length, workouts],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [photosRes, workoutsRes, nutritionRes, inbodyRes] = await Promise.all([
        fetch("/api/progress-photos", { credentials: "include" }),
        fetch("/api/log/workout?limit=100", { credentials: "include" }),
        fetch("/api/log/nutrition-report", { credentials: "include" }),
        fetch("/api/inbody", { credentials: "include" }),
      ]);

      const photoRows = photosRes.ok ? ((await photosRes.json()) as PhotoRow[]) : [];
      const workoutRows = workoutsRes.ok ? ((await workoutsRes.json()) as WorkoutRow[]) : [];
      const nutritionRows = nutritionRes.ok ? ((await nutritionRes.json()) as NutritionRow[]) : [];
      const inbodyRows = inbodyRes.ok ? ((await inbodyRes.json()) as InbodyRow[]) : [];

      setPhotos(photoRows.map((row) => row.imageBase64));
      setWorkouts(workoutRows);
      setNutritionReports(nutritionRows);
      setInbodyReports(inbodyRows);
    } catch {
      toast.error("Failed to load progress data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File is too large, maximum 2MB");
      return;
    }

    setBusy(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      try {
        await fetch("/api/progress-photos", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        });
        toast.success("Photo added");
        load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setBusy(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleWeeklyAnalysis = async () => {
    if (analysisBusy) return;
    setAnalysisBusy(true);
    try {
      const res = await fetch("/api/weekly-analysis", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Analysis failed");
      }
      toast.success("Weekly analysis ready");
      navigate({ to: "/analyses" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalysisBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageHeader
          title="Progress"
          description="Real signals from your logs, InBody reports, nutrition, and photos."
        />
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          onClick={handleUploadClick}
          disabled={busy}
          className="mb-2 w-full gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 md:mb-0 md:w-auto"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          Add progress photo
        </Button>
      </div>

      {loading ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#111612]/95 p-6 text-sm text-stone-400">
          <Loader2 className="mr-2 inline size-4 animate-spin" />
          Loading progress signals
        </div>
      ) : (
        <>
          <section className="mt-8 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 shadow-[0_28px_80px_-62px_rgba(244,179,43,0.75)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-primary">
                    <Sparkles className="size-4" />
                    Weekly signal
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-50">
                    {summary.weekSessions} session{summary.weekSessions === 1 ? "" : "s"} logged
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-stone-400">
                    {summary.analysisReady
                      ? "You have enough recent signal for a useful Alex check-in."
                      : "Log two sessions or two nutrition days to make the weekly check-in stronger."}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-stone-300">
                  Last 7 days
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <StatCard
                  icon={Activity}
                  title="Month sessions"
                  value={String(summary.monthSessions)}
                  detail="Last 30 days"
                />
                <StatCard
                  icon={LineChart}
                  title="Week volume"
                  value={`${summary.weekVolumeKg.toLocaleString()}kg`}
                  detail="Sets x reps x load"
                />
                <StatCard
                  icon={Utensils}
                  title="Nutrition logs"
                  value={String(summary.nutritionLogsThisWeek)}
                  detail="This week"
                />
              </div>
            </div>

            <div className="grid gap-4">
              <TrendCard summary={summary} />
              <button
                type="button"
                onClick={handleWeeklyAnalysis}
                disabled={analysisBusy}
                className="group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#111612]/95 p-5 text-left transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">Weekly AI analysis</h3>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">
                    Ask Alex to turn your recent logs into wins, risks, and next-week focus.
                  </p>
                </div>
                <div className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-400 transition group-hover:border-primary/30 group-hover:bg-primary/15 group-hover:text-primary">
                  {analysisBusy ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <ChevronRight className="size-5" />
                  )}
                </div>
              </button>
            </div>
          </section>

          <section className="mt-10">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-100">
                  Progress photos
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {summary.photoSlotsRemaining > 0
                    ? `${summary.photoSlotsRemaining} open slot${
                        summary.photoSlotsRemaining === 1 ? "" : "s"
                      } in the first comparison row.`
                    : "Your first comparison row is filled."}{" "}
                  Camera upload is ready for quick gym-floor check-ins.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleUploadClick}
                className="rounded-xl border-white/15 bg-white/[0.05] text-slate-100 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
              >
                <ImagePlus className="mr-2 size-4" />
                Add photo
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 animate-fade-in md:grid-cols-4">
              {photos.map((src, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10"
                >
                  <img
                    src={src}
                    alt={`Progress photo ${idx + 1}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                    <span className="text-xs font-semibold text-primary">Photo {idx + 1}</span>
                  </div>
                </div>
              ))}
              {photos.length < 4 && (
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="flex aspect-[3/4] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.05] text-slate-500 transition hover:bg-white/10 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Camera className="mb-2 size-6 opacity-60" />
                  <span className="text-xs font-medium">Add photo</span>
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  detail,
}: {
  icon: typeof Activity;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="mt-4 text-xs text-slate-400">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

function TrendCard({ summary }: { summary: ProgressExperience }) {
  const TrendIcon =
    summary.weightTrend.direction === "down"
      ? TrendingDown
      : summary.weightTrend.direction === "up"
        ? TrendingUp
        : Scale;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-400">Weight trend</div>
          <h3 className="mt-2 text-2xl font-semibold text-slate-100">
            {summary.weightTrend.label}
          </h3>
          <p className="mt-2 text-sm text-slate-400">{summary.weightTrend.detail}</p>
        </div>
        <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <TrendIcon className="size-5" />
        </div>
      </div>

      {summary.latestInbody ? (
        <div className="mt-5 grid grid-cols-3 gap-2">
          <MiniMetric label="Weight" value={`${summary.latestInbody.weightKg}kg`} />
          <MiniMetric label="Muscle" value={`${summary.latestInbody.muscleMassKg ?? 0}kg`} />
          <MiniMetric label="Body fat" value={`${summary.latestInbody.bodyFatPercent ?? 0}%`} />
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
          Add an InBody report to show weight, muscle, and body-fat trend here.
        </div>
      )}

      {summary.latestInbody && (
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="size-4" />
          Latest report: {formatDate(summary.latestInbody.reportDate)}
        </div>
      )}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}
