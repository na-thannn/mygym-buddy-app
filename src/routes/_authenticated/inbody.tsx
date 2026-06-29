import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  Loader2,
  Scale,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listInbodyReports } from "@/lib/inbody.functions";
import { buildInbodyExperience, type InbodyDelta } from "@/lib/customer-experience";
import { compressImageFile } from "@/lib/image-compress";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inbody")({
  head: () => ({ meta: [{ title: "InBody - HL Fitness" }] }),
  component: Inbody,
});

type Report = Awaited<ReturnType<typeof listInbodyReports>>[number];

type FormState = {
  reportDate: string;
  weightKg: string;
  muscleMassKg: string;
  bodyFatPercent: string;
};

const today = () => new Date().toISOString().slice(0, 10);

function Inbody() {
  const [reports, setReports] = useState<Report[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    reportDate: today(),
    weightKg: "",
    muscleMassKg: "",
    bodyFatPercent: "",
  });
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const summary = useMemo(() => buildInbodyExperience(reports), [reports]);

  const fetchReports = useCallback(async () => {
    const res = await fetch("/api/inbody", { credentials: "include" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Unable to load InBody history");
    }
    return res.json() as Promise<Report[]>;
  }, []);

  const saveReport = async (payload: {
    data: {
      reportDate: string;
      weightKg: number;
      muscleMassKg: number;
      bodyFatPercent: number;
      imageBase64?: string | null;
      source?: string;
    };
  }) => {
    const res = await fetch("/api/inbody", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Unable to save report");
    }
    return res.json();
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setReports(await fetchReports());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load InBody history";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [fetchReports]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!open) {
      setScanImage(null);
      return;
    }
    setForm({
      reportDate: today(),
      weightKg: summary.latest?.weightKg ? String(summary.latest.weightKg) : "",
      muscleMassKg: summary.latest?.muscleMassKg ? String(summary.latest.muscleMassKg) : "",
      bodyFatPercent: summary.latest?.bodyFatPercent ? String(summary.latest.bodyFatPercent) : "",
    });
  }, [open, summary.latest]);

  const handleScanUpload = async (file: File) => {
    setScanBusy(true);
    try {
      const imageBase64 = await compressImageFile(file);
      setScanImage(imageBase64);
      const res = await fetch("/api/inbody/scan", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Scan failed");
      if (data.extracted) {
        setForm((current) => ({
          ...current,
          reportDate: data.extracted.reportDate || current.reportDate,
          weightKg: String(data.extracted.weightKg ?? current.weightKg),
          muscleMassKg: String(data.extracted.muscleMassKg ?? current.muscleMassKg),
          bodyFatPercent: String(data.extracted.bodyFatPercent ?? current.bodyFatPercent),
        }));
        toast.success("Scan extracted. Review the numbers before saving.");
      } else if (data.message) {
        toast.message(data.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not process scan");
    } finally {
      setScanBusy(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = {
      reportDate: form.reportDate,
      weightKg: Number(form.weightKg),
      muscleMassKg: Number(form.muscleMassKg),
      bodyFatPercent: Number(form.bodyFatPercent),
    };
    if (
      !payload.reportDate ||
      !Number.isFinite(payload.weightKg) ||
      !Number.isFinite(payload.muscleMassKg) ||
      !Number.isFinite(payload.bodyFatPercent)
    ) {
      toast.error("Enter report date, weight, muscle, and body fat");
      return;
    }

    setBusy(true);
    try {
      await saveReport({
        data: {
          ...payload,
          imageBase64: scanImage,
          source: scanImage ? "scan" : "manual",
        },
      });
      toast.success("InBody report saved");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 md:p-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageHeader
          title="InBody Reports"
          description="Turn body-composition numbers into a clearer baseline and trend."
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="mb-2 w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 md:mb-0 md:w-auto">
              <Upload className="size-4" />
              Add result
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/10 bg-[#0a0c08] text-slate-200 sm:max-w-[520px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>Log InBody result</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Enter numbers manually or upload a scanned InBody report for Alex to read.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-5">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleScanUpload(file);
                    e.currentTarget.value = "";
                  }}
                />
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-white/15 bg-white/[0.05] text-slate-100 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                    disabled={scanBusy}
                    onClick={() => fileRef.current?.click()}
                  >
                    {scanBusy ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 size-4" />
                    )}
                    Upload scanned report
                  </Button>
                  {scanImage && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                      <img src={scanImage} alt="InBody scan preview" className="max-h-48 w-full object-contain" />
                    </div>
                  )}
                </div>
                <Field label="Report date">
                  <Input
                    type="date"
                    value={form.reportDate}
                    onChange={(e) => setForm({ ...form, reportDate: e.target.value })}
                    required
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Weight (kg)">
                    <Input
                      type="number"
                      step="0.1"
                      value={form.weightKg}
                      onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                      placeholder="80.2"
                      required
                    />
                  </Field>
                  <Field label="Muscle (kg)">
                    <Input
                      type="number"
                      step="0.1"
                      value={form.muscleMassKg}
                      onChange={(e) => setForm({ ...form, muscleMassKg: e.target.value })}
                      placeholder="35.4"
                      required
                    />
                  </Field>
                  <Field label="Body fat (%)">
                    <Input
                      type="number"
                      step="0.1"
                      value={form.bodyFatPercent}
                      onChange={(e) => setForm({ ...form, bodyFatPercent: e.target.value })}
                      placeholder="17.8"
                      required
                    />
                  </Field>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
                >
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save result
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#111612]/95 p-6 text-sm text-slate-400">
          <Loader2 className="mr-2 inline size-4 animate-spin" />
          Loading InBody history
        </div>
      ) : loadError ? (
        <EmptyState title="InBody history could not load" detail={loadError} onRetry={load} />
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 shadow-[0_30px_80px_-55px_rgba(250,204,21,0.45)] sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-medium text-primary">{summary.baselineLabel}</div>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100">
                    {summary.latest ? formatDate(summary.latest.reportDate) : "Add your first scan"}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                    {summary.previous
                      ? `Compared with ${formatDate(summary.previous.reportDate)}.`
                      : "Add another result later to unlock trend comparisons."}
                  </p>
                </div>
                <div className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Scale className="size-5" />
                </div>
              </div>

              {summary.latest ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <MetricCard
                    icon={Scale}
                    label="Weight"
                    value={`${summary.latest.weightKg}kg`}
                    delta={summary.deltas.weightKg}
                  />
                  <MetricCard
                    icon={Activity}
                    label="Muscle"
                    value={`${summary.latest.muscleMassKg}kg`}
                    delta={summary.deltas.muscleMassKg}
                  />
                  <MetricCard
                    icon={ClipboardList}
                    label="Body fat"
                    value={`${summary.latest.bodyFatPercent}%`}
                    delta={summary.deltas.bodyFatPercent}
                  />
                </div>
              ) : (
                <EmptyState
                  title="No InBody report yet"
                  detail="Add weight, skeletal muscle, and body-fat percentage to create your baseline."
                  compact
                />
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 sm:p-6">
              <div className="mb-4">
                <div className="text-xs text-slate-400">Trend summary</div>
                <h3 className="mt-2 text-lg font-semibold text-slate-100">Latest comparison</h3>
              </div>
              {summary.previous ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <DeltaCard delta={summary.deltas.weightKg} />
                  <DeltaCard delta={summary.deltas.muscleMassKg} />
                  <DeltaCard delta={summary.deltas.bodyFatPercent} />
                </div>
              ) : (
                <EmptyState
                  title="One report saved"
                  detail="Your next report will show whether weight, muscle, and body fat are moving."
                  compact
                />
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">History</div>
                <h3 className="mt-2 text-lg font-semibold text-slate-100">Comparison history</h3>
              </div>
              <div className="grid size-10 place-items-center rounded-2xl bg-white/[0.05] text-slate-300">
                <ClipboardList className="size-5" />
              </div>
            </div>

            {summary.history.length === 0 ? (
              <EmptyState
                title="No reports yet"
                detail="Add your first report to begin body-composition tracking."
                compact
              />
            ) : (
              <div className="space-y-3">
                {summary.history.map((r, index) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-slate-100">{formatDate(r.reportDate)}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          Weight {r.weightKg}kg | Muscle {r.muscleMassKg}kg | Fat {r.bodyFatPercent}
                          %
                        </div>
                        {"imageBase64" in r && r.imageBase64 && (
                          <img
                            src={r.imageBase64 as string}
                            alt="InBody scan"
                            className="mt-2 max-h-24 rounded-lg border border-white/10 object-contain"
                          />
                        )}
                      </div>
                      {index === 0 && (
                        <span className="rounded-full bg-primary/15 px-2 py-1 text-[11px] text-primary">
                          Latest
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: typeof Scale;
  label: string;
  value: string;
  delta: InbodyDelta;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <Icon className="size-5" />
        </div>
        <DeltaPill delta={delta} />
      </div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function DeltaCard({ delta }: { delta: InbodyDelta }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-xs text-slate-400">{delta.label}</div>
      <div className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-100">
        <TrendIcon direction={delta.direction} />
        {formatDelta(delta)}
      </div>
    </div>
  );
}

function DeltaPill({ delta }: { delta: InbodyDelta }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-slate-300">
      <TrendIcon direction={delta.direction} />
      {formatDelta(delta)}
    </div>
  );
}

function TrendIcon({ direction }: { direction: InbodyDelta["direction"] }) {
  if (direction === "up") return <ArrowUpRight className="size-3.5 text-emerald-200" />;
  if (direction === "down") return <ArrowDownRight className="size-3.5 text-blue-200" />;
  return <ArrowRight className="size-3.5 text-slate-400" />;
}

function formatDelta(delta: InbodyDelta) {
  if (delta.value === null) return "No comparison";
  const sign = delta.value > 0 ? "+" : delta.value < 0 ? "-" : "";
  return `${sign}${Math.abs(delta.value).toFixed(1)}${delta.unit}`;
}

function EmptyState({
  title,
  detail,
  onRetry,
  compact = false,
}: {
  title: string;
  detail: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-white/10 bg-white/[0.03] text-center ${
        compact ? "p-5" : "mt-8 p-8"
      }`}
    >
      <div className="text-sm font-medium text-slate-100">{title}</div>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">{detail}</p>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
