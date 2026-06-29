import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Apple,
  ChevronRight,
  Flame,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { buildNutritionExperience } from "@/lib/customer-experience";
import { compressImageFile } from "@/lib/image-compress";
import { normalizeMealMacros } from "@/lib/meal-macros";
import {
  clearNutritionFeedDraft,
  readNutritionFeedDraft,
  suggestedBucketToSlot,
  type MealSlot,
  type NutritionFeedDraft,
} from "@/lib/nutrition-feed-draft";
import type { listNutritionReports } from "@/lib/nutrition.functions";

export const Route = createFileRoute("/_authenticated/nutrition")({
  head: () => ({ meta: [{ title: "Nutrition - HL Fitness" }] }),
  component: Nutrition,
});

type Row = Awaited<ReturnType<typeof listNutritionReports>>[number];
type DayType = "Workout day" | "Rest day" | "Cheat day";

type FormState = {
  reportDate: string;
  dayType: DayType;
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string;
  preWorkoutMeal: string;
  postWorkoutMeal: string;
  notes: string;
  estimateMacros: boolean;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatsG: string;
};

const EMPTY: FormState = {
  reportDate: new Date().toISOString().slice(0, 10),
  dayType: "Workout day",
  breakfast: "",
  lunch: "",
  dinner: "",
  snacks: "",
  preWorkoutMeal: "",
  postWorkoutMeal: "",
  notes: "",
  estimateMacros: true,
  calories: "",
  proteinG: "",
  carbsG: "",
  fatsG: "",
};

const MEAL_FIELDS = [
  {
    key: "breakfast",
    label: "Breakfast",
    placeholder: "Greek yogurt, berries, oats",
    hint: "First meal",
  },
  {
    key: "lunch",
    label: "Lunch",
    placeholder: "Chicken bowl, salad",
    hint: "Midday fuel",
  },
  {
    key: "dinner",
    label: "Dinner",
    placeholder: "Salmon, rice, greens",
    hint: "Evening meal",
  },
  {
    key: "snacks",
    label: "Snacks",
    placeholder: "Protein bar, fruit",
    hint: "Small bites",
  },
  {
    key: "preWorkoutMeal",
    label: "Pre-workout",
    placeholder: "Banana, espresso",
    hint: "Before training",
  },
  {
    key: "postWorkoutMeal",
    label: "Post-workout",
    placeholder: "Shake, oats",
    hint: "Recovery",
  },
] satisfies Array<{
  key: keyof Pick<
    FormState,
    "breakfast" | "lunch" | "dinner" | "snacks" | "preWorkoutMeal" | "postWorkoutMeal"
  >;
  label: string;
  placeholder: string;
  hint: string;
}>;

const alexNutritionPrompt =
  "Build a simple meal plan for this week using my recent nutrition logs and training goal.";

type PhotoMealAnalysis = {
  mealName: string;
  macros: NutritionFeedDraft["macros"];
  suggestedBucket?: string;
};

function Nutrition() {
  const [rows, setRows] = useState<Row[]>([]);
  const [f, setF] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedDraft, setFeedDraft] = useState<NutritionFeedDraft | null>(null);
  const [feedMealSlot, setFeedMealSlot] = useState<MealSlot | "">("");
  const [photoDraft, setPhotoDraft] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoMealAnalysis | null>(null);
  const [photoMealSlot, setPhotoMealSlot] = useState<MealSlot | "">("");
  const photoFileRef = useRef<HTMLInputElement | null>(null);

  const list = useCallback(async () => {
    const res = await fetch("/api/log/nutrition-report", { credentials: "include" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Unable to load nutrition logs");
    }
    return res.json() as Promise<Row[]>;
  }, []);

  const save = async (payload: { data: Record<string, unknown> }) => {
    const res = await fetch("/api/log/nutrition-report", {
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

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setRows(await list());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load nutrition logs";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const draft = readNutritionFeedDraft();
    if (!draft) return;
    clearNutritionFeedDraft();
    setFeedDraft(draft);
    const suggested = suggestedBucketToSlot(draft.suggestedBucket);
    if (suggested) setFeedMealSlot(suggested);
    setF((current) => {
      const next = {
        ...current,
        reportDate: draft.reportDate || current.reportDate,
        estimateMacros: false,
        calories: draft.macros ? String(Math.round(draft.macros.calories)) : "",
        proteinG: draft.macros ? String(Math.round(draft.macros.proteinG)) : "",
        carbsG: draft.macros ? String(Math.round(draft.macros.carbsG)) : "",
        fatsG: draft.macros ? String(Math.round(draft.macros.fatsG)) : "",
      };
      if (suggested) {
        next[suggested] = draft.mealName;
      }
      return next;
    });
  }, []);

  const applyFeedMealSlot = (slot: MealSlot) => {
    if (!feedDraft) return;
    setFeedMealSlot(slot);
    setF((current) => ({
      ...current,
      [slot]: current[slot] ? `${current[slot]}; ${feedDraft.mealName}` : feedDraft.mealName,
    }));
  };

  const applyMealAnalysisToForm = (
    analysis: PhotoMealAnalysis,
    slot: MealSlot | "" | null | undefined,
  ) => {
    const resolvedSlot = slot || suggestedBucketToSlot(analysis.suggestedBucket);
    setF((current) => {
      const next: FormState = {
        ...current,
        estimateMacros: analysis.macros ? false : current.estimateMacros,
        calories: analysis.macros ? String(Math.round(analysis.macros.calories)) : current.calories,
        proteinG: analysis.macros ? String(Math.round(analysis.macros.proteinG)) : current.proteinG,
        carbsG: analysis.macros ? String(Math.round(analysis.macros.carbsG)) : current.carbsG,
        fatsG: analysis.macros ? String(Math.round(analysis.macros.fatsG)) : current.fatsG,
      };
      if (resolvedSlot) {
        next[resolvedSlot] = analysis.mealName;
      }
      return next;
    });
    if (resolvedSlot) {
      setPhotoMealSlot(resolvedSlot);
    }
  };

  const attachPhoto = async (file: File) => {
    setImageBusy(true);
    try {
      const base64 = await compressImageFile(file);
      setPhotoDraft(base64);
      setPhotoAnalysis(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not process image");
    } finally {
      setImageBusy(false);
    }
  };

  const analysePhotoMeal = async () => {
    const note = photoNote.trim();
    if (!photoDraft && !note) {
      toast.error("Add a photo or meal description first");
      return;
    }
    setPhotoBusy(true);
    try {
      const res = await fetch("/api/nutrition/analyse-meal", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          imageBase64: photoDraft,
          note: note || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Could not analyse meal");
      const macros = normalizeMealMacros(data.macros);
      const analysis: PhotoMealAnalysis = {
        mealName: typeof data.mealName === "string" ? data.mealName : note || "Meal",
        macros,
        suggestedBucket:
          typeof data.suggestedBucket === "string" ? data.suggestedBucket : undefined,
      };
      setPhotoAnalysis(analysis);
      applyMealAnalysisToForm(analysis, suggestedBucketToSlot(analysis.suggestedBucket));
      if (macros) {
        toast.success(`Estimated ~${Math.round(macros.calories)} kcal`);
      } else if (data.aiConfigured === false) {
        toast.error("AI is not configured. Set GROQ_API_KEY to estimate macros.");
      } else {
        toast.message("Meal identified, but macros could not be estimated.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not analyse meal");
    } finally {
      setPhotoBusy(false);
    }
  };

  const applyPhotoMealSlot = (slot: MealSlot) => {
    if (!photoAnalysis) return;
    setPhotoMealSlot(slot);
    setF((current) => ({
      ...current,
      [slot]: photoAnalysis.mealName,
    }));
  };

  const resetPhotoDraft = () => {
    setPhotoDraft(null);
    setPhotoNote("");
    setPhotoAnalysis(null);
    setPhotoMealSlot("");
  };

  const summary = useMemo(
    () =>
      buildNutritionExperience({
        today: new Date().toISOString().slice(0, 10),
        reports: rows,
      }),
    [rows],
  );

  const liveMacroSummary = useMemo(
    () => ({
      calories: parseOptionalNumber(f.calories),
      proteinG: parseOptionalNumber(f.proteinG),
      carbsG: parseOptionalNumber(f.carbsG),
      fatsG: parseOptionalNumber(f.fatsG),
    }),
    [f.calories, f.carbsG, f.fatsG, f.proteinG],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const hasMeals = MEAL_FIELDS.some((field) => f[field.key].trim());
    const hasNotes = f.notes.trim().length > 0;
    const hasManualMacros = [f.calories, f.proteinG, f.carbsG, f.fatsG].some((m) => m.trim());
    if (f.estimateMacros && !hasMeals) {
      toast.error("Add at least one meal to estimate macros");
      return;
    }
    if (!hasMeals && !hasNotes && !hasManualMacros) {
      toast.error("Add a meal, note, or macros first");
      return;
    }

    setBusy(true);
    try {
      const r = await save({
        data: {
          reportDate: f.reportDate,
          dayType: f.dayType,
          breakfast: f.breakfast || null,
          lunch: f.lunch || null,
          dinner: f.dinner || null,
          snacks: f.snacks || null,
          preWorkoutMeal: f.preWorkoutMeal || null,
          postWorkoutMeal: f.postWorkoutMeal || null,
          notes: f.notes || null,
          estimateMacros: f.estimateMacros,
          calories: parseOptionalNumber(f.calories),
          proteinG: parseOptionalNumber(f.proteinG),
          carbsG: parseOptionalNumber(f.carbsG),
          fatsG: parseOptionalNumber(f.fatsG),
        },
      });
      toast.success(r.macros?.calories ? `Saved: ~${r.macros.calories} kcal` : "Report saved");
      if (feedDraft?.postId) {
        fetch("/api/feed/confirm-meal-log", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            postId: feedDraft.postId,
            mealName: feedDraft.mealName,
            macros: feedDraft.macros,
          }),
        }).catch(() => {});
      }
      setFeedDraft(null);
      setFeedMealSlot("");
      resetPhotoDraft();
      setF({ ...EMPTY, reportDate: new Date().toISOString().slice(0, 10) });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const macroSource = f.estimateMacros ? summary.latestMacros : liveMacroSummary;

  return (
    <div className="mx-auto max-w-6xl p-4 pb-24 md:p-8">
      <PageHeader
        title="Nutrition"
        subtitle="Log meals quickly, keep macros readable, and give Alex better coaching context."
        action={
          <Button
            asChild
            variant="outline"
            className="w-full border-white/10 text-slate-200 hover:border-primary/30 hover:text-primary sm:w-auto"
          >
            <a href={`/trainer?prompt=${encodeURIComponent(alexNutritionPrompt)}`}>
              Generate with Alex
              <ChevronRight className="ml-1 size-4" />
            </a>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <form
            onSubmit={submit}
            className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 shadow-[0_30px_80px_-55px_rgba(250,204,21,0.55)] sm:p-6"
          >
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-medium text-primary">Daily log</div>
                <h2 className="mt-2 text-xl font-semibold text-slate-100">Build today by meals</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">
                  Add what you remember. One useful note is better than a perfect blank day.
                </p>
              </div>
              <div className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                <Utensils className="size-5" />
              </div>
            </div>

            {feedDraft && (
              <div className="mb-5 rounded-2xl border border-primary/30 bg-primary/[0.08] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Sparkles className="size-4" />
                  From your feed post
                </div>
                <p className="mt-2 text-sm text-slate-300">
                  Choose which meal slot to log{" "}
                  <span className="font-medium text-slate-100">{feedDraft.mealName}</span> under,
                  then save when ready.
                </p>
                {feedDraft.macros && (
                  <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                    <FeedDraftMacro label="Calories" value={`${Math.round(feedDraft.macros.calories)} kcal`} />
                    <FeedDraftMacro label="Protein" value={`${Math.round(feedDraft.macros.proteinG)} g`} />
                    <FeedDraftMacro label="Carbs" value={`${Math.round(feedDraft.macros.carbsG)} g`} />
                    <FeedDraftMacro label="Fat" value={`${Math.round(feedDraft.macros.fatsG)} g`} />
                  </div>
                )}
                <div className="mt-3 max-w-xs">
                  <Label className="text-slate-300">Meal slot</Label>
                  <Select
                    value={feedMealSlot || undefined}
                    onValueChange={(v) => applyFeedMealSlot(v as MealSlot)}
                  >
                    <SelectTrigger className="mt-1 border-white/10 bg-black/30">
                      <SelectValue placeholder="Pick breakfast, lunch, dinner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MEAL_FIELDS.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="mb-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <ImageIcon className="size-4 text-primary" />
                    Estimate from photo
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Upload a meal photo and optional caption.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <Textarea
                  rows={2}
                  value={photoNote}
                  onChange={(e) => setPhotoNote(e.target.value)}
                  placeholder="Optional caption, e.g. full English breakfast"
                  className="border-white/10 bg-black/30"
                />

                {photoDraft && (
                  <div className="relative inline-block max-w-full">
                    <img
                      src={photoDraft}
                      alt="Meal preview"
                      className="max-h-48 rounded-xl border border-white/10 object-cover"
                    />
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => {
                        setPhotoDraft(null);
                        setPhotoAnalysis(null);
                      }}
                      className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/70 text-slate-200 hover:bg-black/90"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <input
                    ref={photoFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await attachPhoto(file);
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={imageBusy}
                    className="border-white/10 text-slate-200 hover:border-primary/30 hover:text-primary"
                    onClick={() => photoFileRef.current?.click()}
                  >
                    {imageBusy ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <ImageIcon className="mr-2 size-4" />
                    )}
                    {photoDraft ? "Change photo" : "Add photo"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={photoBusy || imageBusy || (!photoDraft && !photoNote.trim())}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={analysePhotoMeal}
                  >
                    {photoBusy ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 size-4" />
                    )}
                    Estimate meal
                  </Button>
                </div>

                {photoAnalysis && (
                  <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
                    <div className="text-sm text-slate-200">
                      Alex estimated{" "}
                      <span className="font-medium text-slate-50">{photoAnalysis.mealName}</span>
                    </div>
                    {photoAnalysis.macros ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                        <FeedDraftMacro
                          label="Calories"
                          value={`${Math.round(photoAnalysis.macros.calories)} kcal`}
                        />
                        <FeedDraftMacro
                          label="Protein"
                          value={`${Math.round(photoAnalysis.macros.proteinG)} g`}
                        />
                        <FeedDraftMacro
                          label="Carbs"
                          value={`${Math.round(photoAnalysis.macros.carbsG)} g`}
                        />
                        <FeedDraftMacro
                          label="Fat"
                          value={`${Math.round(photoAnalysis.macros.fatsG)} g`}
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Macros could not be estimated automatically. You can enter totals below.
                      </p>
                    )}
                    <div className="mt-3 max-w-xs">
                      <Label className="text-slate-300">Meal slot</Label>
                      <Select
                        value={photoMealSlot || undefined}
                        onValueChange={(v) => applyPhotoMealSlot(v as MealSlot)}
                      >
                        <SelectTrigger className="mt-1 border-white/10 bg-black/30">
                          <SelectValue placeholder="Pick breakfast, lunch, dinner..." />
                        </SelectTrigger>
                        <SelectContent>
                          {MEAL_FIELDS.map((field) => (
                            <SelectItem key={field.key} value={field.key}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Date">
                <Input
                  type="date"
                  value={f.reportDate}
                  onChange={(e) => setF({ ...f, reportDate: e.target.value })}
                  required
                />
              </Field>
              <Field label="Day type">
                <Select
                  value={f.dayType}
                  onValueChange={(v) => setF({ ...f, dayType: v as DayType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Workout day">Workout day</SelectItem>
                    <SelectItem value="Rest day">Rest day</SelectItem>
                    <SelectItem value="Cheat day">Cheat day</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {MEAL_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Label>{field.label}</Label>
                    <span className="text-[11px] text-slate-500">{field.hint}</span>
                  </div>
                  <Input
                    value={f[field.key]}
                    onChange={(e) => setF({ ...f, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>

            <Field label="Notes" className="mt-4">
              <Textarea
                rows={3}
                value={f.notes}
                onChange={(e) => setF({ ...f, notes: e.target.value })}
                placeholder="Energy, cravings, timing, digestion, hunger"
              />
            </Field>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-100">Estimate macros with AI</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">
                    Turn this off when you already know the totals.
                  </div>
                </div>
                <Switch
                  checked={f.estimateMacros}
                  onCheckedChange={(checked) => setF({ ...f, estimateMacros: checked })}
                />
              </div>
              <div
                className={`mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 ${
                  f.estimateMacros ? "opacity-60" : ""
                }`}
              >
                <MacroInput
                  label="Calories"
                  value={f.calories}
                  disabled={f.estimateMacros}
                  placeholder={f.estimateMacros ? "AI estimate" : "2100"}
                  onChange={(value) => setF({ ...f, calories: value })}
                />
                <MacroInput
                  label="Protein (g)"
                  value={f.proteinG}
                  disabled={f.estimateMacros}
                  placeholder={f.estimateMacros ? "AI estimate" : "160"}
                  onChange={(value) => setF({ ...f, proteinG: value })}
                />
                <MacroInput
                  label="Carbs (g)"
                  value={f.carbsG}
                  disabled={f.estimateMacros}
                  placeholder={f.estimateMacros ? "AI estimate" : "220"}
                  onChange={(value) => setF({ ...f, carbsG: value })}
                />
                <MacroInput
                  label="Fats (g)"
                  value={f.fatsG}
                  disabled={f.estimateMacros}
                  placeholder={f.estimateMacros ? "AI estimate" : "70"}
                  onChange={(value) => setF({ ...f, fatsG: value })}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-1.5 size-4" />
                    Save log
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-slate-300 hover:text-slate-100 sm:w-auto"
                onClick={() => {
                  resetPhotoDraft();
                  setF({ ...EMPTY, reportDate: new Date().toISOString().slice(0, 10) });
                }}
              >
                <RotateCcw className="mr-2 size-4" />
                Reset
              </Button>
            </div>
          </form>

          <HistoryPanel
            rows={rows}
            loading={loading}
            loadError={loadError}
            onRetry={load}
            renderMacro={renderMacro}
          />
        </div>

        <aside className="space-y-6">
          <MacroPanel
            title={f.estimateMacros ? "Latest macro snapshot" : "Manual macro preview"}
            subtitle={
              f.estimateMacros
                ? summary.latest
                  ? `From ${formatDate(summary.latest.reportDate)}`
                  : "No macro data yet"
                : "From the numbers you are entering"
            }
            macros={macroSource}
          />

          <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Week rhythm</div>
                <h3 className="mt-2 text-lg font-semibold text-slate-100">
                  {summary.weekLogCount} day{summary.weekLogCount === 1 ? "" : "s"} logged
                </h3>
              </div>
              <div className="grid size-10 place-items-center rounded-2xl bg-primary/15 text-primary">
                <Flame className="size-5" />
              </div>
            </div>
            <MacroPanelBody macros={summary.averageMacros} compact />
            <p className="mt-4 text-sm leading-6 text-slate-400">
              Average from nutrition logs in the last 7 days.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Latest meals</div>
                <h3 className="mt-2 text-lg font-semibold text-slate-100">
                  {summary.latest ? formatDate(summary.latest.reportDate) : "Nothing logged yet"}
                </h3>
              </div>
              <div className="grid size-10 place-items-center rounded-2xl bg-white/[0.05] text-slate-300">
                <Apple className="size-5" />
              </div>
            </div>

            {loading ? (
              <LoadingRows />
            ) : summary.latestMeals.length === 0 ? (
              <EmptyBlock
                title="No meals to show"
                detail="Save a meal, snack, or note and this panel becomes your quick review."
              />
            ) : (
              <div className="space-y-3">
                {summary.latestMeals.map((meal) => (
                  <div key={meal.label} className="rounded-xl bg-white/[0.05] p-3">
                    <div className="text-xs text-slate-500">{meal.label}</div>
                    <div className="mt-1 text-sm text-slate-100">{meal.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function FeedDraftMacro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-100">{value}</div>
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

function MacroInput({
  label,
  value,
  disabled,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        step="1"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </Field>
  );
}

function MacroPanel({
  title,
  subtitle,
  macros,
}: {
  title: string;
  subtitle: string;
  macros: {
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatsG: number | null;
  };
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 shadow-[0_25px_60px_-50px_rgba(59,130,246,0.45)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400">{subtitle}</div>
          <h3 className="mt-2 text-lg font-semibold text-slate-100">{title}</h3>
        </div>
        <div className="grid size-10 place-items-center rounded-2xl bg-blue-400/15 text-blue-200">
          <Flame className="size-5" />
        </div>
      </div>
      <MacroPanelBody macros={macros} />
    </div>
  );
}

function MacroPanelBody({
  macros,
  compact = false,
}: {
  macros: {
    calories: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatsG: number | null;
  };
  compact?: boolean;
}) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${compact ? "md:grid-cols-4" : ""}`}>
      <MacroTile label="Calories" value={renderMacro(macros.calories, " kcal")} />
      <MacroTile label="Protein" value={renderMacro(macros.proteinG, "g")} />
      <MacroTile label="Carbs" value={renderMacro(macros.carbsG, "g")} />
      <MacroTile label="Fats" value={renderMacro(macros.fatsG, "g")} />
    </div>
  );
}

function MacroTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.05] p-3">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function HistoryPanel({
  rows,
  loading,
  loadError,
  onRetry,
  renderMacro,
}: {
  rows: Row[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
  renderMacro: (value: number | null, suffix: string) => string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-400">History</div>
          <h3 className="mt-2 text-lg font-semibold text-slate-100">Recent logs</h3>
        </div>
        <div className="grid size-10 place-items-center rounded-2xl bg-white/[0.05] text-slate-300">
          <Apple className="size-5" />
        </div>
      </div>

      {loading ? (
        <LoadingRows />
      ) : loadError ? (
        <EmptyBlock
          title="Nutrition logs could not load"
          detail={loadError}
          action={
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyBlock
          title="No logs yet"
          detail="Start with one meal or note. Alex can work with partial days."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-medium text-slate-100">{formatDate(r.reportDate)}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {r.dayType ?? "Day type not set"}
                  </div>
                </div>
                <div className="text-xs font-medium text-primary">
                  {renderMacro(r.calories, " kcal")}
                </div>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                P {renderMacro(r.proteinG, "g")} | C {renderMacro(r.carbsG, "g")} | F{" "}
                {renderMacro(r.fatsG, "g")}
              </div>
              {(r.breakfast || r.lunch || r.dinner || r.snacks) && (
                <div className="mt-2 line-clamp-2 text-xs text-slate-400">
                  {[r.breakfast, r.lunch, r.dinner, r.snacks].filter(Boolean).join(" | ")}
                </div>
              )}
              {r.notes && <div className="mt-2 text-xs italic text-slate-300">{r.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-20 animate-pulse rounded-2xl bg-white/[0.05]" />
      ))}
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

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function renderMacro(value: number | null, suffix: string) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)}${suffix}`
    : "-";
}
