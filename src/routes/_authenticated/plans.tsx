import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listPlans } from "@/lib/plans.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "@/lib/format";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({ meta: [{ title: "Kế hoạch tập — HL Fitness" }] }),
  component: PlansPage,
});

type Row = Awaited<ReturnType<typeof listPlans>>[number];

function PlansPage() {
  const list = useServerFn(listPlans);
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => setRows(await list()), [list]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <PageHeader
        title="Kế hoạch tập"
        subtitle="Yêu cầu Alex generate kế hoạch trong tab Alex Chat — sẽ tự lưu về đây."
      />
      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            Chưa có kế hoạch. Vào Alex Chat và nói: "Build me a 4-day workout plan".
          </div>
        )}
        {rows.map((r) => {
          const isOpen = open === r.id;
          return (
            <div key={r.id} className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between p-3">
                <button className="flex-1 text-left min-w-0" onClick={() => setOpen(isOpen ? null : r.id)}>
                  <div className="font-medium text-sm truncate">{r.title ?? `Plan ${r.planDate}`}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(r.planDate)}</div>
                </button>
                <Button variant="ghost" size="icon" onClick={() => setOpen(isOpen ? null : r.id)}>
                  {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </Button>
              </div>
              {isOpen && (
                <div className="border-t border-border p-3 prose prose-sm max-w-none dark:prose-invert">
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
