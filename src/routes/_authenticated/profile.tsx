import { createFileRoute, Link } from "@tanstack/react-router";
import { HL_FITNESS_GYM_ACCESS } from "@/lib/trainer/hl-fitness-layout";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/authContext";
import { buildProfileSetupSummary, type ProfileSetupItem } from "@/lib/customer-experience";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle2,
  CircleDashed,
  Dumbbell,
  Loader2,
  MessageCircle,
  Scale,
  ShieldCheck,
  Target,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile - HL Fitness" }] }),
  component: ProfilePage,
});

type Form = {
  goal: string;
  level: string;
  daysPerWeek: string;
  limitations: string;
  age: string;
  gender: string;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
};

const EMPTY: Form = {
  goal: "",
  level: "",
  daysPerWeek: "",
  limitations: "",
  age: "",
  gender: "",
  heightCm: "",
  weightKg: "",
  targetWeightKg: "",
};

const TRAINING_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
const DAYS_PER_WEEK_OPTIONS = ["2 days", "3 days", "4 days", "5 days", "6+ days"] as const;
const GENDER_OPTIONS = ["male", "female", "other"] as const;

const SETUP_ICONS = {
  training: Target,
  body: Scale,
  safety: ShieldCheck,
} satisfies Record<ProfileSetupItem["id"], typeof Target>;

function ProfilePage() {
  const { user } = useAuth();
  const [f, setF] = useState<Form>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const setup = useMemo(() => buildProfileSetupSummary(f), [f]);

  const fetchProfile = async () => {
    const res = await fetch("/api/profile", { credentials: "include" });
    if (res.status === 204 || !res.ok) return null;
    return res.json();
  };

  const doSave = async (payload: { data: Record<string, unknown> }) => {
    const res = await fetch("/api/profile", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload.data),
    });
    if (!res.ok) throw new Error("Save failed");
    return res.json();
  };

  useEffect(() => {
    let cancelled = false;
    fetchProfile()
      .then((p) => {
        if (cancelled) return;
        if (p) {
          setF({
            goal: p.goal ?? "",
            level: normalizeTrainingLevel(p.level),
            daysPerWeek: normalizeDaysPerWeek(p.daysPerWeek),
            limitations: p.limitations ?? "",
            age: p.age?.toString() ?? "",
            gender: normalizeGender(p.gender),
            heightCm: p.heightCm?.toString() ?? "",
            weightKg: p.weightKg?.toString() ?? "",
            targetWeightKg: p.targetWeightKg?.toString() ?? "",
          });
        }
      })
      .catch(() => toast.error("Failed to load profile"))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const num = (s: string) => (s ? Number(s) : null);
    try {
      await doSave({
        data: {
          goal: f.goal || null,
          level: f.level || null,
          daysPerWeek: f.daysPerWeek || null,
          equipment: HL_FITNESS_GYM_ACCESS,
          limitations: f.limitations || null,
          age: num(f.age),
          gender: f.gender || null,
          heightCm: num(f.heightCm),
          weightKg: num(f.weightKg),
          targetWeightKg: num(f.targetWeightKg),
        },
      });
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-6 text-sm text-stone-400">
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 pb-24 md:p-8">
      <PageHeader
        title="Coach profile"
        subtitle={`Signed in as ${user?.email ?? ""}`}
        action={
          <Button
            asChild
            variant="outline"
            className="rounded-xl border-white/15 bg-white/[0.05] text-slate-100 hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
          >
            <Link to="/trainer">
              Ask Alex <MessageCircle className="ml-2 size-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <form onSubmit={save} className="space-y-5">
          <section className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 animate-fade-up">
            <SectionHeader
              icon={Dumbbell}
              title="Training context"
              description="Tell Alex what you are working toward and how experienced you are."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Goal">
                <Input
                  value={f.goal}
                  onChange={(e) => setF({ ...f, goal: e.target.value })}
                  placeholder="Fat loss, lean mass, performance"
                />
              </Field>
              <Field label="Training level">
                <Select
                  value={selectValue(f.level, TRAINING_LEVELS)}
                  onValueChange={(v) => setF({ ...f, level: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Days per week">
                <Select
                  value={selectValue(f.daysPerWeek, DAYS_PER_WEEK_OPTIONS)}
                  onValueChange={(v) => setF({ ...f, daysPerWeek: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How often can you train?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2 days">2 days</SelectItem>
                    <SelectItem value="3 days">3 days</SelectItem>
                    <SelectItem value="4 days">4 days</SelectItem>
                    <SelectItem value="5 days">5 days</SelectItem>
                    <SelectItem value="6+ days">6+ days</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Gym access" className="sm:col-span-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-stone-300">
                  {HL_FITNESS_GYM_ACCESS}. Alex plans around the HL Fitness floor layout (Floors
                  1-4).
                </div>
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 animate-fade-up stagger-1">
            <SectionHeader
              icon={Scale}
              title="Body baseline"
              description="These numbers help progress reviews stay grounded in your actual starting point."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Age">
                <Input
                  type="number"
                  value={f.age}
                  onChange={(e) => setF({ ...f, age: e.target.value })}
                />
              </Field>
              <Field label="Gender">
                <Select
                  value={selectValue(f.gender, GENDER_OPTIONS)}
                  onValueChange={(v) => setF({ ...f, gender: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Height (cm)">
                <Input
                  type="number"
                  step="0.1"
                  value={f.heightCm}
                  onChange={(e) => setF({ ...f, heightCm: e.target.value })}
                />
              </Field>
              <Field label="Current weight (kg)">
                <Input
                  type="number"
                  step="0.1"
                  value={f.weightKg}
                  onChange={(e) => setF({ ...f, weightKg: e.target.value })}
                />
              </Field>
              <Field label="Target weight (kg)">
                <Input
                  type="number"
                  step="0.1"
                  value={f.targetWeightKg}
                  onChange={(e) => setF({ ...f, targetWeightKg: e.target.value })}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 animate-fade-up stagger-2">
            <SectionHeader
              icon={ShieldCheck}
              title="Safety context"
              description="Add anything a coach should remember before suggesting exercises or intensity."
            />
            <div className="mt-5">
              <Field label="Limitations or injuries">
                <Textarea
                  rows={4}
                  maxLength={500}
                  value={f.limitations}
                  onChange={(e) => setF({ ...f, limitations: e.target.value })}
                  placeholder="Lower back pain, shoulder issue, or none"
                />
              </Field>
            </div>
          </section>

          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-stone-50">Save this context</div>
              <p className="mt-1 text-xs leading-5 text-stone-400">
                Alex and your coaches can use it for safer, more relevant guidance.
              </p>
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save profile
            </Button>
          </div>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 shadow-[0_28px_80px_-62px_rgba(244,179,43,0.75)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-primary">Alex readiness</div>
                <div className="mt-2 text-3xl font-semibold text-stone-50">{setup.percent}%</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-stone-300">
                {setup.completedCount} / {setup.totalCount}
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${setup.percent}%` }}
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-stone-400">
              A fuller profile helps Alex write plans, explain progress, and flag when human coach
              input matters.
            </p>
          </div>

          <div className="space-y-3">
            {setup.items.map((item) => (
              <SetupCard key={item.id} item={item} />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Dumbbell;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
        <Icon className="size-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-stone-50">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-400">{description}</p>
      </div>
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
  children: ReactNode;
}) {
  return (
    <div className={`space-y-1.5${className ? ` ${className}` : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SetupCard({ item }: { item: ProfileSetupItem }) {
  const Icon = SETUP_ICONS[item.id];
  const StateIcon = item.complete ? CheckCircle2 : CircleDashed;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-stone-50">{item.title}</h3>
            <StateIcon
              className={item.complete ? "size-4 text-primary" : "size-4 text-stone-500"}
            />
          </div>
          <div className="mt-1 text-xs font-medium text-primary">{item.status}</div>
          <p className="mt-2 text-xs leading-5 text-stone-400">{item.detail}</p>
          {item.missing.length > 0 && (
            <div className="mt-3 text-xs text-stone-500">Missing: {item.missing.join(", ")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function selectValue<T extends string>(value: string, allowed: readonly T[]): T | undefined {
  return allowed.includes(value as T) ? (value as T) : undefined;
}

function normalizeTrainingLevel(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  const match = TRAINING_LEVELS.find((level) => level.toLowerCase() === trimmed.toLowerCase());
  return match ?? "";
}

function normalizeGender(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().toLowerCase();
  return GENDER_OPTIONS.includes(trimmed as (typeof GENDER_OPTIONS)[number]) ? trimmed : "";
}

function normalizeDaysPerWeek(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (DAYS_PER_WEEK_OPTIONS.includes(trimmed as (typeof DAYS_PER_WEEK_OPTIONS)[number])) {
    return trimmed;
  }
  const match = trimmed.match(/^(\d+)\+?\s*(?:days?)?$/i);
  if (!match) return "";
  const count = Number(match[1]);
  if (!Number.isFinite(count)) return "";
  if (count >= 6) return "6+ days";
  const candidate = `${count} days`;
  return DAYS_PER_WEEK_OPTIONS.includes(candidate as (typeof DAYS_PER_WEEK_OPTIONS)[number])
    ? candidate
    : "";
}
