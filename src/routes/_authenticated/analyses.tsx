import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Loader2,
  Sparkles,
  Target,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/_authenticated/analyses")({
  head: () => ({ meta: [{ title: "Coach Reviews - HL Fitness" }] }),
  component: AnalysesPage,
});

type Row = { id: string; planDate: string; contentMd: string; createdAt: string };

const alexReviewPrompt =
  "Analyze my progress this week using my workouts, nutrition, InBody, plan, and photos. Save the review.";

function AnalysesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const list = useCallback(async () => {
    const res = await fetch("/api/analyses", { credentials: "include" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Unable to load coach reviews");
    }
    return res.json() as Promise<Row[]>;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setRows(await list());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Unable to load coach reviews");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    load();
  }, [load]);

  const latest = rows[0] ?? null;
  const latestSummary = useMemo(
    () => (latest ? summarizeReview(latest.contentMd) : null),
    [latest],
  );

  useEffect(() => {
    if (!open && latest) setOpen(latest.id);
  }, [latest, open]);

  return (
    <div className="mx-auto max-w-5xl p-4 pb-24 md:p-8">
      <PageHeader
        title="Coach Reviews"
        subtitle="Readable Alex feedback saved from weekly analyses and plan reviews."
        action={
          <Button
            asChild
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          >
            <a href={`/trainer?prompt=${encodeURIComponent(alexReviewPrompt)}`}>
              <Sparkles className="mr-2 size-4" />
              New review
            </a>
          </Button>
        }
      />

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-6 text-sm text-slate-400">
          <Loader2 className="mr-2 inline size-4 animate-spin" />
          Loading coach reviews
        </div>
      ) : loadError ? (
        <EmptyState title="Coach reviews could not load" detail={loadError} onRetry={load} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No coach reviews yet"
          detail="Ask Alex for a weekly analysis after logging a few workouts or nutrition days."
          action={
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <a href={`/trainer?prompt=${encodeURIComponent(alexReviewPrompt)}`}>Ask Alex</a>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <aside className="space-y-6">
            {latest && latestSummary && (
              <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 shadow-[0_30px_80px_-55px_rgba(250,204,21,0.45)] sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium text-primary">Latest feedback</div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100">
                      {formatDate(latest.planDate)}
                    </h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Saved {formatDate(latest.createdAt)}
                    </p>
                  </div>
                  <div className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                    <BadgeCheck className="size-5" />
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <ReviewSignal icon={BadgeCheck} label="Main read" value={latestSummary.summary} />
                  <ReviewSignal icon={Target} label="Next focus" value={latestSummary.nextStep} />
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">History</div>
                  <h3 className="mt-2 text-lg font-semibold text-slate-100">Saved reviews</h3>
                </div>
                <div className="grid size-10 place-items-center rounded-2xl bg-white/[0.05] text-slate-300">
                  <ClipboardList className="size-5" />
                </div>
              </div>
              <div className="space-y-3">
                {rows.map((r) => {
                  const isOpen = open === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setOpen(isOpen ? null : r.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition hover:bg-white/[0.06] ${
                        isOpen
                          ? "border-primary/40 bg-primary/10"
                          : "border-white/10 bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-100">
                            Review for {formatDate(r.planDate)}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            Saved {formatDate(r.createdAt)}
                          </div>
                        </div>
                        <ChevronRight className="size-4 shrink-0 text-slate-500" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 sm:p-6">
            {rows.map((r) => {
              const isOpen = open === r.id;
              if (!isOpen) return null;
              return (
                <div key={r.id}>
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Coaching feedback</div>
                      <h2 className="mt-2 text-xl font-semibold text-slate-100">
                        Review for {formatDate(r.planDate)}
                      </h2>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-slate-300"
                      onClick={() => setOpen(null)}
                    >
                      {isOpen ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </Button>
                  </div>
                  <div className="prose prose-sm max-w-none prose-invert prose-headings:text-slate-100 prose-li:my-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{r.contentMd}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      )}
    </div>
  );
}

function ReviewSignal({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BadgeCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <div className="text-sm leading-6 text-slate-100">{value}</div>
    </div>
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
  action?: React.ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-[#111612]/95 p-8 text-center">
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

function summarizeReview(content: string) {
  const lines = content
    .split("\n")
    .map((line) =>
      line
        .replace(/^#+\s*/, "")
        .replace(/^[-*]\s*/, "")
        .trim(),
    )
    .filter(Boolean);
  const summary = lines.find((line) => !/^summary$/i.test(line)) ?? "Review saved.";
  const nextStep =
    lines.find((line) => /next|focus|adjust|priority/i.test(line) && line !== summary) ??
    "Open the full review for the next action.";
  return { summary, nextStep };
}
