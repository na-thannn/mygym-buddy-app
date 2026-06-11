import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  BadgeCheck,
  Camera,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  FileText,
  LineChart,
  Loader2,
  Scale,
  Sparkles,
  Trophy,
  Utensils,
} from "lucide-react";
import { buildWeeklyCheckIn, type WeeklyCheckInItem } from "@/lib/customer-experience";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/progress-report")({
  head: () => ({ meta: [{ title: "Weekly Report - HL Fitness" }] }),
  component: ProgressReport,
});

type WorkoutLog = {
  id?: string;
  performedAt: string;
  sets: number | null;
  reps: string | null;
  weightKg: number | null;
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

type PhotoRow = {
  imageBase64: string;
};

type PlanRow = {
  id: string;
  planDate: string;
  title?: string | null;
  contentMd: string;
  createdAt?: string | null;
};

type AnalysisRow = {
  id: string;
  planDate: string;
  contentMd: string;
  createdAt?: string | null;
};

const alexReportPrompt =
  "Create my weekly check-in using workouts, nutrition, InBody, progress photos, active plan, and recent reviews.";

function ProgressReport() {
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [nutritionReports, setNutritionReports] = useState<NutritionRow[]>([]);
  const [inbodyReports, setInbodyReports] = useState<InbodyRow[]>([]);
  const [photoCount, setPhotoCount] = useState(0);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [workoutsRes, nutritionRes, inbodyRes, photosRes, plansRes, analysesRes] =
        await Promise.all([
          fetch("/api/log/workout?limit=5000", { credentials: "include" }),
          fetch("/api/log/nutrition-report", { credentials: "include" }),
          fetch("/api/inbody", { credentials: "include" }),
          fetch("/api/progress-photos", { credentials: "include" }),
          fetch("/api/plans", { credentials: "include" }),
          fetch("/api/analyses", { credentials: "include" }),
        ]);

      if (!workoutsRes.ok) throw new Error("Unable to load workout logs");

      setWorkouts(await workoutsRes.json());
      setNutritionReports(nutritionRes.ok ? await nutritionRes.json() : []);
      setInbodyReports(inbodyRes.ok ? await inbodyRes.json() : []);
      const photos = photosRes.ok ? ((await photosRes.json()) as PhotoRow[]) : [];
      setPhotoCount(photos.length);
      setPlans(plansRes.ok ? await plansRes.json() : []);
      setAnalyses(analysesRes.ok ? await analysesRes.json() : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load weekly report";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const checkIn = useMemo(
    () =>
      buildWeeklyCheckIn({
        today: new Date().toISOString().slice(0, 10),
        workouts,
        nutritionReports,
        inbodyReports,
        photoCount,
        plans,
        analyses,
      }),
    [analyses, inbodyReports, nutritionReports, photoCount, plans, workouts],
  );

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
      <PageHeader
        title="Weekly Report"
        subtitle="A member check-in built from real training, nutrition, InBody, photos, plans, and reviews."
        action={
          <Button
            asChild
            variant="outline"
            className="w-full border-white/10 text-slate-200 hover:text-primary sm:w-auto"
          >
            <a href={`/trainer?prompt=${encodeURIComponent(alexReportPrompt)}`}>
              Ask Alex
              <ChevronRight className="ml-2 size-4" />
            </a>
          </Button>
        }
      />

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-6 text-sm text-slate-400">
          <Loader2 className="mr-2 inline size-4 animate-spin" />
          Loading weekly check-in
        </div>
      ) : loadError ? (
        <EmptyState title="Weekly report could not load" detail={loadError} onRetry={load} />
      ) : workouts.length === 0 && nutritionReports.length === 0 && inbodyReports.length === 0 ? (
        <EmptyState
          title="No progress data yet"
          detail="Log a workout, nutrition day, or InBody report and this page will build your check-in."
          action={
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/log/workout">Log a workout</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 shadow-[0_30px_80px_-55px_rgba(250,204,21,0.5)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium text-primary">
                    <Sparkles className="size-4" />
                    Last 7 days
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-100">
                    {checkIn.progress.weekSessions} session
                    {checkIn.progress.weekSessions === 1 ? "" : "s"} logged
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                    {checkIn.progress.analysisReady
                      ? "There is enough signal for Alex to write useful coaching feedback."
                      : "Add another training or nutrition entry to make the review sharper."}
                  </p>
                </div>
                <Button
                  type="button"
                  disabled={analysisBusy}
                  onClick={handleWeeklyAnalysis}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                >
                  {analysisBusy ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 size-4" />
                  )}
                  Generate review
                </Button>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <StatCard
                  icon={<Dumbbell className="size-5" />}
                  label="Month sessions"
                  value={String(checkIn.progress.monthSessions)}
                  detail="Last 30 days"
                />
                <StatCard
                  icon={<LineChart className="size-5" />}
                  label="Week volume"
                  value={`${checkIn.progress.weekVolumeKg.toLocaleString()}kg`}
                  detail="Sets x reps x load"
                />
                <StatCard
                  icon={<Utensils className="size-5" />}
                  label="Nutrition logs"
                  value={String(checkIn.progress.nutritionLogsThisWeek)}
                  detail="This week"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Body trend</div>
                  <h3 className="mt-2 text-xl font-semibold text-slate-100">
                    {checkIn.progress.weightTrend.label}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {checkIn.progress.weightTrend.detail}
                  </p>
                </div>
                <div className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Scale className="size-5" />
                </div>
              </div>
              {checkIn.progress.latestInbody ? (
                <div className="grid grid-cols-3 gap-2">
                  <MiniMetric
                    label="Weight"
                    value={`${checkIn.progress.latestInbody.weightKg}kg`}
                  />
                  <MiniMetric
                    label="Muscle"
                    value={`${checkIn.progress.latestInbody.muscleMassKg ?? 0}kg`}
                  />
                  <MiniMetric
                    label="Fat"
                    value={`${checkIn.progress.latestInbody.bodyFatPercent ?? 0}%`}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                  Add an InBody report to include body-composition context.
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 sm:p-6">
              <div className="mb-4">
                <div className="text-xs text-slate-400">Check-in readiness</div>
                <h3 className="mt-2 text-lg font-semibold text-slate-100">What Alex can use</h3>
              </div>
              <div className="space-y-3">
                {checkIn.items.map((item) => (
                  <CheckInItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>

            <div className="grid gap-6">
              <ContextCard
                icon={<ClipboardList className="size-5" />}
                title="Active plan"
                label={
                  checkIn.activePlan
                    ? checkIn.activePlan.title || `Plan ${checkIn.activePlan.planDate}`
                    : "No saved plan"
                }
                detail={
                  checkIn.activePlan
                    ? `Saved for ${formatDate(checkIn.activePlan.planDate)}`
                    : "Save or generate a plan to compare intent against completed work."
                }
                href="/plans"
              />
              <ContextCard
                icon={<FileText className="size-5" />}
                title="Latest coach review"
                label={
                  checkIn.latestAnalysis
                    ? `Review for ${formatDate(checkIn.latestAnalysis.planDate)}`
                    : "No review saved"
                }
                detail={
                  checkIn.latestAnalysis
                    ? "Open Coach Reviews to continue from the latest feedback."
                    : "Generate a review once training and nutrition data are ready."
                }
                href="/analyses"
              />
              <ContextCard
                icon={<Camera className="size-5" />}
                title="Progress photos"
                label={`${photoCount} photo${photoCount === 1 ? "" : "s"} saved`}
                detail={
                  photoCount >= 2
                    ? "Visual comparison is ready for the check-in."
                    : "Add at least two photos for a better visual check."
                }
                href="/progress"
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
        {icon}
      </div>
      <div className="mt-4 text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
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

function CheckInItemCard({ item }: { item: WeeklyCheckInItem }) {
  const iconById: Record<WeeklyCheckInItem["id"], ReactNode> = {
    training: <Dumbbell className="size-4" />,
    nutrition: <Utensils className="size-4" />,
    inbody: <Scale className="size-4" />,
    plan: <ClipboardList className="size-4" />,
    photos: <Camera className="size-4" />,
  };

  return (
    <a
      href={item.href}
      className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]"
    >
      <div
        className={`grid size-9 shrink-0 place-items-center rounded-xl ${
          item.complete ? "bg-emerald-400/15 text-emerald-200" : "bg-white/[0.06] text-slate-400"
        }`}
      >
        {item.complete ? <BadgeCheck className="size-4" /> : iconById[item.id]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium text-slate-100">{item.title}</div>
          <div className="text-xs text-slate-400">{item.status}</div>
        </div>
        <p className="mt-1 text-sm leading-6 text-slate-400">{item.detail}</p>
      </div>
    </a>
  );
}

function ContextCard({
  icon,
  title,
  label,
  detail,
  href,
}: {
  icon: ReactNode;
  title: string;
  label: string;
  detail: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-[#111612]/95 p-5 transition hover:bg-white/[0.05]"
    >
      <div className="flex min-w-0 gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-slate-400">{title}</div>
          <div className="mt-1 truncate text-base font-semibold text-slate-100">{label}</div>
          <p className="mt-1 text-sm leading-6 text-slate-400">{detail}</p>
        </div>
      </div>
      <ChevronRight className="mt-3 size-5 shrink-0 text-slate-500 transition group-hover:text-primary" />
    </a>
  );
}

function EmptyState({
  title,
  detail,
  action,
  onRetry,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-[#111612]/95 p-8 text-center">
      <Trophy className="mx-auto mb-3 size-8 text-slate-500" />
      <div className="text-lg font-semibold text-slate-100">{title}</div>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{detail}</p>
      {action && <div className="mt-5">{action}</div>}
      {onRetry && (
        <Button type="button" variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
