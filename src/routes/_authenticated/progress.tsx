import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { LineChart, Camera, TrendingUp, Calendar, ChevronRight, Loader2 } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { listProgressPhotos, addProgressPhoto } from "@/lib/progress-photos.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({ meta: [{ title: "Progress — HL Fitness" }] }),
  component: Progress,
});

type Photo = Awaited<ReturnType<typeof listProgressPhotos>>[number];

function Progress() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPhotos = async () => {
    const res = await fetch('/api/progress-photos', { credentials: 'include' });
    if (!res.ok) return [];
    const rows = await res.json();
    return rows.map((r: any) => r.imageBase64) as string[];
  };

  const savePhoto = async (payload: { data: { imageBase64: string } }) => {
    await fetch('/api/progress-photos', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload.data) });
  };

  const load = useCallback(async () => {
    try {
      setPhotos(await fetchPhotos());
    } catch {
      toast.error("Failed to load photos");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
    
    // Read to base64
    const reader = new FileReader();
    reader.onload = async (ev) => {
       const base64 = ev.target?.result as string;
       try {
         await savePhoto({ data: { imageBase64: base64 } });
         toast.success("Photo added!");
         load();
       } catch (err) {
         toast.error(err instanceof Error ? err.message : "Upload failed");
       } finally {
         setBusy(false);
       }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset
  };

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <PageHeader title="My Progress" description="Track your physical changes and milestones" />
        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
        <Button onClick={handleUploadClick} disabled={busy} className="bg-yellow-400 text-yellow-950 hover:bg-yellow-300 gap-2 mb-2 md:mb-0 w-full md:w-auto">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} 
          Add Progress Photo
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-6 animate-fade-up">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-yellow-400/20 text-yellow-400 grid place-items-center">
                  <TrendingUp className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-300">Current Streak</div>
                  <div className="text-2xl font-bold text-slate-100">12 Days</div>
                </div>
              </div>
           </div>
           <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
             <div className="h-full bg-yellow-400 w-[60%] rounded-full"></div>
           </div>
           <p className="text-xs text-slate-500 mt-3">8 days left to reach your monthly goal!</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-6 animate-fade-up stagger-1">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-400/20 text-blue-400 grid place-items-center">
                  <LineChart className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-300">Weight Trend</div>
                  <div className="text-2xl font-bold text-slate-100">Down 2.4kg</div>
                </div>
              </div>
           </div>
           <div className="flex items-center gap-2 mt-4 text-sm text-slate-400">
             <Calendar className="size-4" /> Last 30 Days
           </div>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-slate-100 mt-10 mb-6">Progress Photos</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
         {photos.map((src, idx) => (
           <div key={idx} className="aspect-[3/4] rounded-xl overflow-hidden border border-white/10 group relative">
             <img src={src} alt="Progress" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition">
               <span className="text-xs text-yellow-400 font-semibold uppercase">Week {idx + 1}</span>
             </div>
           </div>
         ))}
         {photos.length < 4 && (
           <div onClick={handleUploadClick} className="aspect-[3/4] rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-center text-slate-500 hover:bg-white/10 hover:text-slate-300 transition cursor-pointer">
              <Camera className="size-6 mb-2 opacity-50" />
              <span className="text-xs font-medium">Add Photo</span>
           </div>
         )}
      </div>

      <div className="mt-10 rounded-2xl border border-white/10 bg-black/40 backdrop-blur p-6 animate-fade-in flex items-center justify-between group cursor-pointer hover:bg-white/5 transition">
        <div>
          <h3 className="text-lg font-semibold text-slate-200 mb-1">Weekly AI Analysis</h3>
          <p className="text-slate-400 text-sm max-w-sm">Get personalized insights on your progress from Alex.</p>
        </div>
        <div className="size-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-slate-400 group-hover:bg-yellow-400/20 group-hover:text-yellow-400 group-hover:border-yellow-400/30 transition">
          <ChevronRight className="size-5" />
        </div>
      </div>
    </div>
  );
}