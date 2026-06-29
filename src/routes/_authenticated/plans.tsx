import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listPlans } from "@/lib/plans.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Download,
  Loader2,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { selectActivePlan } from "@/lib/customer-experience";
import { downloadMarkdown, sanitizeMarkdownFilename } from "@/lib/download-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({ meta: [{ title: "Training Plans - HL Fitness" }] }),
  component: PlansPage,
});

type Row = Awaited<ReturnType<typeof listPlans>>[number];
type FormState = {
  planDate: string;
  title: string;
  contentMd: string;
};

const EMPTY: FormState = {
  planDate: new Date().toISOString().slice(0, 10),
  title: "",
  contentMd: "",
};

const alexPlanPrompt =
  "Generate my next training plan using my profile, recent workouts, InBody reports, and limitations.";

function planDownloadName(plan: Row) {
  return sanitizeMarkdownFilename(`${plan.title || "plan"}-${plan.planDate}`);
}

function PlansPage() {
  const list = useCallback(async () => {
    const res = await fetch("/api/plans", { credentials: "include" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Unable to load plans");
    }
    return res.json() as Promise<Row[]>;
  }, []);

  const save = async (payload: { data: Record<string, unknown> }) => {
    const res = await fetch("/api/plans", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Save failed");
    }
    return res.json();
  };

  const requestFeedback = async (payload: { data: Record<string, unknown> }) => {
    const res = await fetch("/api/plan-feedback", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Feedback failed");
    }
    return res.json();
  };

  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [f, setF] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setRows(await list());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load plans";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    load();
  }, [load]);

  const activePlan = useMemo(
    () => selectActivePlan({ today: new Date().toISOString().slice(0, 10), plans: rows }),
    [rows],
  );

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!f.contentMd.trim()) {
      toast.error("Add your plan details first");
      return;
    }
    setSaving(true);
    try {
      await save({
        data: {
          planDate: f.planDate,
          title: f.title || null,
          contentMd: f.contentMd.trim(),
        },
      });
      toast.success("Plan saved");
      setF({ ...EMPTY, title: f.title, contentMd: "" });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleFeedback = async () => {
    if (!f.contentMd.trim()) {
      toast.error("Add a plan to get feedback");
      return;
    }
    setFeedbackBusy(true);
    try {
      const res = await requestFeedback({
        data: {
          planDate: f.planDate,
          title: f.title || null,
          contentMd: f.contentMd.trim(),
        },
      });
      setFeedback(res.feedback ?? "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Feedback failed");
    } finally {
      setFeedbackBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 md:p-8">
      <PageHeader
        title="Training Plans"
        subtitle="Keep your active plan visible, save drafts, and ask Alex for a better next block."
        action={
          <Button
            asChild
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          >
            <a href={`/trainer?prompt=${encodeURIComponent(alexPlanPrompt)}`}>
              <Sparkles className="mr-2 size-4" />
              Generate with Alex
            </a>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 shadow-[0_30px_80px_-55px_rgba(250,204,21,0.55)] sm:p-6"
          >
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-medium text-primary">Plan builder</div>
                <h2 className="mt-2 text-xl font-semibold text-slate-100">Design your week</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">
                  Paste a coach plan, write your own, or save the plan Alex generated in chat.
                </p>
              </div>
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                <ClipboardList className="size-5" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Plan date">
                <Input
                  type="date"
                  value={f.planDate}
                  onChange={(e) => setF({ ...f, planDate: e.target.value })}
                  required
                />
              </Field>
              <Field label="Title">
                <Input
                  value={f.title}
                  onChange={(e) => setF({ ...f, title: e.target.value })}
                  placeholder="Push/Pull/Legs - 4 days"
                />
              </Field>
            </div>

            <Field label="Plan details (Markdown supported)" className="mt-4">
              <Textarea
                rows={11}
                value={f.contentMd}
                onChange={(e) => setF({ ...f, contentMd: e.target.value })}
                placeholder={`Day 1 - Upper
- Bench Press: 4x8
- Rows: 4x10

Day 2 - Lower
- Squats: 4x6
- RDL: 3x10`}
              />
            </Field>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="submit"
                disabled={saving}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  "Save plan"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={feedbackBusy}
                className="w-full border-white/15 bg-white/[0.05] text-slate-100 hover:border-primary/30 hover:bg-primary/10 hover:text-primary sm:w-auto"
                onClick={handleFeedback}
              >
                {feedbackBusy ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Reviewing
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    Review draft
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">AI feedback</div>
                <h3 className="mt-2 text-lg font-semibold text-slate-100">Coach notes</h3>
              </div>
              <div className="grid size-10 place-items-center rounded-2xl bg-white/[0.05] text-slate-300">
                <Sparkles className="size-5" />
              </div>
            </div>
            {!feedback ? (
              <EmptyBlock
                title="No draft review yet"
                detail="Add plan details and ask for feedback to see practical adjustments here."
              />
            ) : (
              <div className="prose prose-sm max-w-none prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{feedback}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <ActivePlanCard activePlan={activePlan} />
          <SavedPlansPanel
            rows={rows}
            activePlanId={activePlan?.id ?? null}
            open={open}
            setOpen={setOpen}
            loading={loading}
            loadError={loadError}
            onRetry={load}
          />
        </aside>
      </div>
    </div>
  );
}

function ActivePlanCard({ activePlan }: { activePlan: Row | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 shadow-[0_25px_60px_-50px_rgba(59,130,246,0.45)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-primary">Active plan</div>
          <h3 className="mt-2 text-xl font-semibold text-slate-100">
            {activePlan ? activePlan.title || `Plan ${activePlan.planDate}` : "No plan saved"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {activePlan
              ? `${formatDate(activePlan.planDate)} is the current training target Alex will use.`
              : "Generate a plan with Alex or save your own plan to create a training target."}
          </p>
        </div>
        <div className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
          <BadgeCheck className="size-5" />
        </div>
      </div>
      <Button
        asChild
        variant="outline"
        className="mt-5 w-full border-white/15 bg-white/[0.05] text-slate-100 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
      >
        <a
          href={`/trainer?prompt=${encodeURIComponent(
            activePlan
              ? `Review my active plan "${activePlan.title || activePlan.planDate}" against my recent workouts.`
              : alexPlanPrompt,
          )}`}
        >
          {activePlan ? "Review active plan with Alex" : "Generate a plan with Alex"}
          <ChevronRight className="ml-2 size-4" />
        </a>
      </Button>
      {activePlan && (
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full border-white/15 bg-white/[0.05] text-slate-100 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
          onClick={() => downloadMarkdown(planDownloadName(activePlan), activePlan.contentMd)}
        >
          <Download className="mr-2 size-4" />
          Download .md
        </Button>
      )}
    </div>
  );
}

function SavedPlansPanel({
  rows,
  activePlanId,
  open,
  setOpen,
  loading,
  loadError,
  onRetry,
}: {
  rows: Row[];
  activePlanId: string | null;
  open: string | null;
  setOpen: (id: string | null) => void;
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400">Library</div>
          <h3 className="mt-2 text-lg font-semibold text-slate-100">Saved plans</h3>
        </div>
        <div className="grid size-10 place-items-center rounded-2xl bg-white/[0.05] text-slate-300">
          <ClipboardList className="size-5" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-2xl bg-white/[0.05]" />
          ))}
        </div>
      ) : loadError ? (
        <EmptyBlock
          title="Plans could not load"
          detail={loadError}
          action={
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyBlock
          title="No plans yet"
          detail="Ask Alex for a plan or save one from your coach."
          action={
            <Button asChild size="sm" className="bg-primary text-primary-foreground">
              <a href={`/trainer?prompt=${encodeURIComponent(alexPlanPrompt)}`}>Open Alex</a>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const isOpen = open === r.id;
            const isActive = activePlanId === r.id;
            return (
              <div
                key={r.id}
                className={`min-w-0 overflow-hidden rounded-2xl border bg-white/[0.05] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 ${
                  isActive ? "border-primary/40" : "border-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3 p-4">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setOpen(isOpen ? null : r.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="truncate text-sm font-medium text-slate-100">
                        {r.title ?? `Plan ${r.planDate}`}
                      </div>
                      {isActive && (
                        <span className="rounded-full bg-primary/15 px-2 py-1 text-[11px] text-primary">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">{formatDate(r.planDate)}</div>
                    {!isOpen && (
                      <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                        {summarizePlan(r.contentMd)}
                      </div>
                    )}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 self-start text-slate-300"
                    onClick={() => setOpen(isOpen ? null : r.id)}
                  >
                    {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 self-start border-white/15 bg-white/[0.05] text-slate-200 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                    aria-label="Download plan"
                    onClick={() => downloadMarkdown(planDownloadName(r), r.contentMd)}
                  >
                    <Download className="size-4" />
                  </Button>
                </div>
                {isOpen && (
                  <div className="min-w-0 border-t border-white/10 p-4">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mb-3 border-white/15 bg-white/[0.05] text-slate-100 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                      onClick={() => downloadMarkdown(planDownloadName(r), r.contentMd)}
                    >
                      <Download className="mr-2 size-4" />
                      Download .md
                    </Button>
                    <div className="prose prose-sm max-w-none prose-invert prose-table:block overflow-x-auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{r.contentMd}</ReactMarkdown>
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

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EmptyBlock({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-center">
      <div className="text-sm font-medium text-slate-100">{title}</div>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">{detail}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function summarizePlan(content: string) {
  return content
    .replace(/[#*_`|>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}
