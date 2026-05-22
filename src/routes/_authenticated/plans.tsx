import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { listPlans } from "@/lib/plans.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "@/lib/format";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({ meta: [{ title: "Training Plans — HL Fitness" }] }),
  component: PlansPage,
});

type Row = Awaited<ReturnType<typeof listPlans>>[number];

function PlansPage() {
  const list = async () => {
    const res = await fetch('/api/plans', { credentials: 'include' });
    if (!res.ok) return [];
    return res.json();
  };
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => setRows(await list()), [list]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader
        title="Training Plans"
        subtitle="Ask Alex to generate a plan in Alex Chat and it will appear here."
      />
      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="text-sm text-slate-400 text-center py-10">
            No plans yet. Open Alex Chat and say: "Build me a 4-day workout plan".
          </div>
        )}
        {rows.map((r) => {
          const isOpen = open === r.id;
          return (
            <div key={r.id} className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/5">
              <div className="flex items-center justify-between p-4">
                <button className="flex-1 text-left min-w-0" onClick={() => setOpen(isOpen ? null : r.id)}>
                  <div className="font-medium text-sm truncate text-slate-100">{r.title ?? `Plan ${r.planDate}`}</div>
                  <div className="text-xs text-slate-400">{formatDate(r.planDate)}</div>
                </button>
                <Button variant="ghost" size="icon" className="text-slate-300" onClick={() => setOpen(isOpen ? null : r.id)}>
                  {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
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
  );
}
