import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { listPlans } from "@/lib/plans.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, ClipboardList, Loader2, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/format";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({ meta: [{ title: "Training Plans — HL Fitness" }] }),
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

function PlansPage() {
  const list = useCallback(async () => {
    const res = await fetch("/api/plans", { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
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

  const load = useCallback(async () => setRows(await list()), [list]);
  useEffect(() => {
    load();
  }, [load]);

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
    <div className="mx-auto max-w-5xl p-4 md:p-8 pb-24 md:pb-8">
      <PageHeader
        title="Training Plans"
        subtitle="Build your own plan, then let AI Coach review it."
        action={
          <Button
            asChild
            variant="outline"
            className="border-white/10 text-slate-200 hover:text-yellow-200 hover:border-yellow-500/30"
          >
            <Link to="/trainer">AI Coach</Link>
          </Button>
        }
      />

      <div className="grid lg:grid-cols-[1.1fr,0.9fr] gap-6">
        <div className="space-y-6">
          <form
            onSubmit={handleSave}
            className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.12),_rgba(0,0,0,0)_55%)] bg-black/40 backdrop-blur p-6 shadow-[0_30px_80px_-50px_rgba(250,204,21,0.55)]"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-yellow-300">
                  Plan builder
                </div>
                <h2 className="text-xl font-semibold text-slate-100 mt-2">Design your week</h2>
                <p className="text-sm text-slate-300">
                  Outline exercises, sets, reps, and rest. Save when ready.
                </p>
              </div>
              <div className="size-12 rounded-2xl bg-yellow-400/15 text-yellow-300 grid place-items-center">
                <ClipboardList className="size-5" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={f.planDate}
                  onChange={(e) => setF({ ...f, planDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>Title</Label>
                <Input
                  value={f.title}
                  onChange={(e) => setF({ ...f, title: e.target.value })}
                  placeholder="Push/Pull/Legs - 4 days"
                />
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <Label>Plan details (Markdown supported)</Label>
              <Textarea
                rows={10}
                value={f.contentMd}
                onChange={(e) => setF({ ...f, contentMd: e.target.value })}
                placeholder={`Day 1 - Upper
- Bench Press: 4x8
- Rows: 4x10

Day 2 - Lower
- Squats: 4x6
- RDL: 3x10`}
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save plan"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={feedbackBusy}
                className="border-white/10 text-slate-200 hover:text-yellow-200"
                onClick={handleFeedback}
              >
                {feedbackBusy ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Reviewing...
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4 mr-2" />
                    Get AI feedback
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">AI feedback</div>
                <h3 className="text-lg font-semibold text-slate-100 mt-2">Coach notes</h3>
              </div>
              <div className="size-10 rounded-2xl bg-white/5 border border-white/10 grid place-items-center text-slate-300">
                <Sparkles className="size-5" />
              </div>
            </div>
            {!feedback && (
              <div className="text-sm text-slate-400">
                Add your plan and request feedback to see suggestions here.
              </div>
            )}
            {feedback && (
              <div className="prose prose-sm max-w-none prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{feedback}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-3xl border border-white/10 bg-black/40 backdrop-blur p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Library</div>
                <h3 className="text-lg font-semibold text-slate-100 mt-2">Saved plans</h3>
              </div>
              <div className="size-10 rounded-2xl bg-white/5 border border-white/10 grid place-items-center text-slate-300">
                <ClipboardList className="size-5" />
              </div>
            </div>
            <div className="space-y-2">
              {rows.length === 0 && (
                <div className="text-sm text-slate-400 text-center py-6">
                  No plans yet. Build one or ask AI Coach in chat.
                </div>
              )}
              {rows.map((r) => {
                const isOpen = open === r.id;
                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-white/10 bg-white/5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    <div className="flex items-center justify-between p-4">
                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => setOpen(isOpen ? null : r.id)}
                      >
                        <div className="font-medium text-sm truncate text-slate-100">
                          {r.title ?? `Plan ${r.planDate}`}
                        </div>
                        <div className="text-xs text-slate-400">{formatDate(r.planDate)}</div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-300"
                        onClick={() => setOpen(isOpen ? null : r.id)}
                      >
                        {isOpen ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </Button>
                    </div>
                    {isOpen && (
                      <div className="border-t border-white/10 p-4 prose prose-sm max-w-none prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{r.contentMd}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
