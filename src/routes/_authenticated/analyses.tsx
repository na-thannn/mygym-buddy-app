import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "@/lib/format";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/_authenticated/analyses")({
  head: () => ({ meta: [{ title: "AI Analysis — HL Fitness" }] }),
  component: AnalysesPage,
});

type Row = { id: string; planDate: string; contentMd: string; createdAt: string };

function AnalysesPage() {
  const [rows, setRows] = useState<Row[]>([]);

  const list = async () => {
    const res = await fetch('/api/analyses', { credentials: 'include' });
    if (!res.ok) return [];
    return res.json();
  };
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => setRows(await list()), [list]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader
        title="AI Analysis"
        subtitle="Ask Alex: 'Analyze my progress this week' and your results will appear here."
      />
      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="text-sm text-slate-400 text-center py-10">No analyses yet.</div>
        )}
        {rows.map((r) => {
          const isOpen = open === r.id;
          return (
            <div key={r.id} className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/5">
              <div className="flex items-center justify-between p-4">
                <button className="flex-1 text-left min-w-0" onClick={() => setOpen(isOpen ? null : r.id)}>
                  <div className="font-medium text-sm text-slate-100">Analysis for {formatDate(r.planDate)}</div>
                  <div className="text-xs text-slate-400">Saved {formatDate(r.createdAt)}</div>
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
