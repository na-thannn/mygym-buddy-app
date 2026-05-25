import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Upload, Scale, Activity, Droplets, Loader2 } from "lucide-react";
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
import { useState, useCallback, useEffect } from "react";
import { listInbodyReports, saveInbodyReport } from "@/lib/inbody.functions";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inbody")({
  head: () => ({ meta: [{ title: "InBody — HL Fitness" }] }),
  component: Inbody,
});

type Report = Awaited<ReturnType<typeof listInbodyReports>>[number];

function Inbody() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ weight: 0, muscle: 0, fat: 0 });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchReports = useCallback(async () => {
    const res = await fetch("/api/inbody", { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  }, []);

  const saveReport = async (payload: {
    data: { reportDate: string; weightKg: number; muscleMassKg: number; bodyFatPercent: number };
  }) => {
    await fetch("/api/inbody", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
    });
  };

  const load = useCallback(async () => {
    try {
      const data = await fetchReports();
      setReports(data);
      if (data.length > 0) {
        setStats({
          weight: data[0].weightKg,
          muscle: data[0].muscleMassKg,
          fat: data[0].bodyFatPercent,
        });
      }
    } catch {
      toast.error("Failed to load history");
    }
  }, [fetchReports]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      await saveReport({
        data: {
          reportDate: new Date().toISOString().slice(0, 10),
          weightKg: Number(fd.get("weight")),
          muscleMassKg: Number(fd.get("muscle")),
          bodyFatPercent: Number(fd.get("fat")),
        },
      });
      toast.success("Saved successfully");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader title="InBody Reports" description="Track your body composition over time" />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300 gap-2 mb-2 md:mb-0 w-full md:w-auto">
              <Upload className="size-4" /> Upload New Result
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-[#0a0c08] border-white/10 text-slate-200">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>Log InBody Result</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Enter your latest metrics from the InBody machine to update your chart.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="weight" className="text-right text-slate-300">
                    Weight (kg)
                  </Label>
                  <Input
                    id="weight"
                    name="weight"
                    type="number"
                    step="0.1"
                    defaultValue={stats.weight}
                    className="col-span-3 bg-white/5 border-white/10"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="muscle" className="text-right text-slate-300">
                    SMM (kg)
                  </Label>
                  <Input
                    id="muscle"
                    name="muscle"
                    type="number"
                    step="0.1"
                    defaultValue={stats.muscle}
                    className="col-span-3 bg-white/5 border-white/10"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="fat" className="text-right text-slate-300">
                    PBF (%)
                  </Label>
                  <Input
                    id="fat"
                    name="fat"
                    type="number"
                    step="0.1"
                    defaultValue={stats.fat}
                    className="col-span-3 bg-white/5 border-white/10"
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={busy}
                  className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300"
                >
                  {busy && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mt-8">
        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-6 animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-yellow-400/20 text-yellow-400 grid place-items-center">
              <Scale className="size-5" />
            </div>
            <div className="text-sm font-medium text-slate-300">Weight</div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-slate-100">{stats.weight}</div>
            <div className="text-sm text-slate-500">kg</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-6 animate-fade-up stagger-1">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-yellow-400/20 text-yellow-400 grid place-items-center">
              <Activity className="size-5" />
            </div>
            <div className="text-sm font-medium text-slate-300">Skeletal Muscle</div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-slate-100">{stats.muscle}</div>
            <div className="text-sm text-slate-500">kg</div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-6 animate-fade-up stagger-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-yellow-400/20 text-yellow-400 grid place-items-center">
              <Droplets className="size-5" />
            </div>
            <div className="text-sm font-medium text-slate-300">Body Fat</div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold text-slate-100">{stats.fat}</div>
            <div className="text-sm text-slate-500">%</div>
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-4 md:p-6 animate-fade-in flex flex-col items-center">
        <h3 className="text-lg font-semibold text-slate-200 mb-6 self-start w-full border-b border-white/10 pb-4">
          Detailed History
        </h3>

        {reports.length === 0 ? (
          <div className="text-center py-10 w-full relative overflow-hidden flex flex-col justify-center items-center">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="size-16 rounded-full bg-slate-800/80 border border-white/10 flex items-center justify-center mb-4">
                <Scale className="size-8 text-slate-400" />
              </div>
              <p className="text-slate-400 text-sm text-center max-w-sm mb-6">
                Upload minimum 1 InBody report to unlock the detailed history graph and AI
                predictive analysis.
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="flex justify-between items-center rounded-xl bg-white/5 border border-white/10 p-4"
              >
                <div>
                  <div className="font-semibold text-slate-200">{formatDate(r.reportDate)}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Weight: {r.weightKg}kg • SMM: {r.muscleMassKg}kg • Fat: {r.bodyFatPercent}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
