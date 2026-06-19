import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Dumbbell,
  Home,
  Loader2,
  MapPin,
  Trophy,
  Video,
  Weight,
} from "lucide-react";
import { toast } from "sonner";
import { KineticSurface, OptimizedPicture } from "@/components/motion/public-funnel-motion";

export const Route = createFileRoute("/get-started")({
  head: () => ({ meta: [{ title: "Get Started - HL Fitness" }] }),
  component: GetStarted,
});

type PtOption = {
  id: string;
  displayName: string;
  email: string;
};

type SlotOption = {
  scheduledAt: string;
  label: string;
};

type OptionsPayload = {
  pts: PtOption[];
  slots: SlotOption[];
  availability: { ptId: string; unavailableSlots: string[] }[];
};

type SubmitResult = {
  status: string;
  emailSent: boolean;
  assignedPtName: string;
  usedFallback: boolean;
  meetingType?: "in_person" | "online";
  onlineMeetingUrl?: string | null;
  zaloDeepLink?: string | null;
};

type CalendarSlot = SlotOption & {
  timeLabel: string;
};

type CalendarDay = {
  key: string;
  weekday: string;
  dayNumber: string;
  month: string;
  fullLabel: string;
  slots: CalendarSlot[];
};

function GetStarted() {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(1);
  const [options, setOptions] = useState<OptionsPayload | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState({
    goal: "",
    experience: "",
    name: "",
    email: "",
    phone: "",
    requestedPtId: "",
    scheduledAt: "",
    meetingType: "in_person" as "in_person" | "online",
  });

  const goals = [
    { title: "Lose Weight & Fat", icon: Weight, desc: "Shed extra pounds and lean out." },
    { title: "Build Muscle", icon: Dumbbell, desc: "Gain mass and raw strength." },
    { title: "Overall Fitness", icon: Activity, desc: "Improve endurance and health." },
    { title: "Prepare for Event", icon: Trophy, desc: "Train for a specific sport or event." },
  ];
  const levels = ["Beginner", "Intermediate", "Advanced"] as const;

  useEffect(() => {
    fetch("/api/guest-meeting-options")
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load coaches and slots");
        return res.json();
      })
      .then((payload: OptionsPayload) => {
        setOptions(payload);
        setData((current) => ({
          ...current,
          requestedPtId: current.requestedPtId || payload.pts[0]?.id || "",
          scheduledAt: current.scheduledAt || payload.slots[0]?.scheduledAt || "",
        }));
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Unable to load options"));
  }, []);

  const progress = step < 5 ? `${(step / 4) * 100}%` : "100%";

  const submitGuestMeeting = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/guest-meetings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          goal: data.goal,
          experience: data.experience,
          requestedPtId: data.requestedPtId,
          scheduledAt: data.scheduledAt,
          meetingType: data.meetingType,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error ?? "Meeting request failed");
      setResult(payload as SubmitResult);
      setStep(5);
      if ((payload as SubmitResult).emailSent) toast.success("Meeting request confirmed");
      else toast.warning("Meeting saved. Email delivery needs SMTP setup.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Meeting request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCoachUnavailable = Boolean(
    options?.availability
      .find((row) => row.ptId === data.requestedPtId)
      ?.unavailableSlots.includes(data.scheduledAt),
  );
  const selectedCoachUnavailableSlots = new Set(
    options?.availability.find((row) => row.ptId === data.requestedPtId)?.unavailableSlots ?? [],
  );
  const calendarDays = options ? buildCalendarDays(options.slots) : [];
  const selectedSlot = options?.slots.find((slot) => slot.scheduledAt === data.scheduledAt);

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#080b0a] text-stone-50 dark">
      <div className="absolute inset-y-0 left-0 hidden h-full w-[46%] opacity-85 saturate-[1.06] lg:block">
        <OptimizedPicture
          src="/redesign/coach-session.png"
          alt=""
          priority
          sizes="(min-width: 1024px) 46vw, 100vw"
        />
      </div>
      <div className="absolute inset-y-0 left-0 hidden w-[58%] bg-[linear-gradient(90deg,rgba(8,11,10,0.18)_0%,rgba(8,11,10,0.66)_56%,#080b0a_100%)] lg:block" />
      <div className="funnel-grid absolute inset-0 opacity-20" />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <Button
            asChild
            variant="ghost"
            className="rounded-xl text-stone-300 hover:bg-white/[0.06] hover:text-stone-50"
          >
            <Link to="/">
              <Home className="mr-2 size-4" strokeWidth={1.8} />
              Back to home
            </Link>
          </Button>
          <div className="hidden items-center gap-3 text-sm text-stone-400 sm:flex">
            <img src="/logo.jpg" alt="Logo" className="size-8 rounded-lg object-cover" />
            <div>
              <div className="text-stone-200">HL Fitness intake</div>
              <div className="text-xs text-stone-500">303 Le Thanh Nghi</div>
            </div>
          </div>
        </div>

        <main className="grid flex-1 items-center gap-8 py-6 lg:grid-cols-[0.72fr_1fr]">
          <section className="hidden self-end pb-10 lg:block">
            <div className="max-w-sm border-l border-primary/60 bg-[#080b0a]/55 p-5 backdrop-blur">
              <div className="text-sm font-semibold text-primary">Private onboarding</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-stone-50">
                Meet a coach first
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-300">
                Guests request a meeting. Your account is created only after a coach confirms you
                are joining HL Fitness.
              </p>
            </div>
          </section>

          <section className="mx-auto w-full max-w-2xl lg:ml-auto">
            <div className="mb-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                style={{ width: progress }}
              />
            </div>

            <KineticSurface
              variant="panel"
              className="funnel-panel rounded-2xl bg-[#111612] p-5 sm:p-8"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
                  transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                >
                  {step === 1 && (
                    <div className="space-y-6">
                      <Header
                        title="What is your primary goal?"
                        desc="We use this to match your first coach meeting to the right context."
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        {goals.map((goal) => {
                          const Icon = goal.icon;
                          return (
                            <button
                              key={goal.title}
                              type="button"
                              onClick={() => {
                                setData({ ...data, goal: goal.title });
                                setStep(2);
                              }}
                              className={`rounded-xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                data.goal === goal.title
                                  ? "border-primary bg-primary/12 text-primary"
                                  : "border-white/10 bg-white/[0.04] text-stone-200 hover:bg-white/[0.07]"
                              }`}
                            >
                              <Icon className="mb-4 size-6" strokeWidth={1.8} />
                              <div className="font-semibold text-stone-50">{goal.title}</div>
                              <div className="mt-1 text-xs leading-5 text-stone-400">
                                {goal.desc}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6">
                      <BackButton onClick={() => setStep(1)} />
                      <Header
                        title="Experience level"
                        desc="How long have you trained consistently?"
                      />
                      <div className="space-y-3">
                        {levels.map((level) => (
                          <button
                            key={level}
                            type="button"
                            onClick={() => {
                              setData({ ...data, experience: level });
                              setStep(3);
                            }}
                            className={`w-full rounded-xl border p-4 text-center font-medium transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              data.experience === level
                                ? "border-primary bg-primary/12 text-primary"
                                : "border-white/10 bg-white/[0.04] text-stone-200 hover:bg-white/[0.07]"
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setStep(4);
                      }}
                      className="space-y-6"
                    >
                      <BackButton onClick={() => setStep(2)} />
                      <Header
                        title="Your contact details"
                        desc="We send meeting confirmation to your email. No account is created yet."
                      />
                      <Field label="Full Name">
                        <Input
                          required
                          value={data.name}
                          onChange={(e) => setData({ ...data, name: e.target.value })}
                          className="h-11 rounded-lg border-white/10 bg-white/[0.06] text-stone-50 placeholder:text-stone-500"
                          placeholder="Minh Nguyen"
                        />
                      </Field>
                      <Field label="Email">
                        <Input
                          required
                          type="email"
                          value={data.email}
                          onChange={(e) => setData({ ...data, email: e.target.value })}
                          className="h-11 rounded-lg border-white/10 bg-white/[0.06] text-stone-50 placeholder:text-stone-500"
                          placeholder="minh@example.com"
                        />
                      </Field>
                      <Field label="Phone Number">
                        <Input
                          required
                          type="tel"
                          value={data.phone}
                          onChange={(e) => setData({ ...data, phone: e.target.value })}
                          className="h-11 rounded-lg border-white/10 bg-white/[0.06] text-stone-50 placeholder:text-stone-500"
                          placeholder="+84..."
                        />
                      </Field>
                      <Button
                        type="submit"
                        className="kinetic-cta h-12 w-full rounded-xl bg-primary text-primary-foreground transition duration-200 hover:bg-primary/90 active:scale-[0.98]"
                      >
                        Choose coach and time{" "}
                        <ArrowRight className="ml-2 size-4" strokeWidth={1.8} />
                      </Button>
                    </form>
                  )}

                  {step === 4 && (
                    <div className="space-y-6">
                      <BackButton onClick={() => setStep(3)} />
                      <Header
                        title="Pick a coach and time"
                        desc="If the selected coach is unavailable for that slot, we assign the first available coach."
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          {
                            value: "in_person" as const,
                            icon: MapPin,
                            title: "In person",
                            desc: "Meet your coach at 303 Le Thanh Nghi.",
                          },
                          {
                            value: "online" as const,
                            icon: Video,
                            title: "Online",
                            desc: "We send a video link and reach out on Zalo.",
                          },
                        ].map((option) => {
                          const Icon = option.icon;
                          const active = data.meetingType === option.value;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setData({ ...data, meetingType: option.value })}
                              className={`rounded-xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                active
                                  ? "border-primary bg-primary/12 text-primary"
                                  : "border-white/10 bg-white/[0.04] text-stone-200 hover:bg-white/[0.07]"
                              }`}
                            >
                              <Icon className="mb-3 size-5" strokeWidth={1.8} />
                              <div className="font-semibold text-stone-50">{option.title}</div>
                              <div className="mt-1 text-xs leading-5 text-stone-400">
                                {option.desc}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {!options && (
                        <div className="grid gap-3">
                          {[0, 1, 2, 3].map((item) => (
                            <div
                              key={item}
                              className="h-14 animate-pulse rounded-xl border border-white/10 bg-white/[0.05]"
                            />
                          ))}
                        </div>
                      )}
                      {options && options.pts.length === 0 && (
                        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm text-stone-300">
                          No coaches are available for guest meetings yet.
                        </div>
                      )}
                      {options && options.pts.length > 0 && (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {options.pts.map((pt) => (
                              <button
                                key={pt.id}
                                type="button"
                                onClick={() => setData({ ...data, requestedPtId: pt.id })}
                                className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                  data.requestedPtId === pt.id
                                    ? "border-primary bg-primary/12"
                                    : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                                }`}
                              >
                                <div className="font-semibold text-stone-50">{pt.displayName}</div>
                                <div className="mt-1 text-xs text-stone-400">{pt.email}</div>
                              </button>
                            ))}
                          </div>
                          <div className="meeting-calendar overflow-hidden rounded-2xl border border-white/10 bg-[#080b0a]/48">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                                  <CalendarDays className="size-5" strokeWidth={1.8} />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-stone-50">
                                    Meeting calendar
                                  </div>
                                  <div className="mt-0.5 text-xs text-stone-400">
                                    {selectedSlot
                                      ? formatSlotDateTime(
                                          selectedSlot.scheduledAt,
                                          selectedSlot.label,
                                        )
                                      : "Select a day and time"}
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-stone-400">
                                {calendarDays.length} day{calendarDays.length === 1 ? "" : "s"}
                              </div>
                            </div>

                            {calendarDays.length === 0 ? (
                              <div className="p-4 text-sm text-stone-300">
                                No meeting slots are available yet.
                              </div>
                            ) : (
                              <div className="overflow-x-auto p-3">
                                <div className="flex min-w-[720px] gap-2">
                                  {calendarDays.map((day) => {
                                    const selectedDay = day.slots.some(
                                      (slot) => slot.scheduledAt === data.scheduledAt,
                                    );

                                    return (
                                      <div
                                        key={day.key}
                                        className={`calendar-day-column flex min-w-[104px] flex-1 flex-col overflow-hidden rounded-xl border ${
                                          selectedDay
                                            ? "border-primary/55 bg-primary/10"
                                            : "border-white/10 bg-white/[0.035]"
                                        }`}
                                      >
                                        <div className="border-b border-white/10 p-3 text-center">
                                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
                                            {day.weekday}
                                          </div>
                                          <div className="mt-1 text-2xl font-semibold leading-none text-stone-50">
                                            {day.dayNumber}
                                          </div>
                                          <div className="mt-1 text-xs text-stone-500">
                                            {day.month}
                                          </div>
                                        </div>
                                        <div className="grid gap-2 p-2">
                                          {day.slots.map((slot) => {
                                            const active = data.scheduledAt === slot.scheduledAt;
                                            const unavailable = selectedCoachUnavailableSlots.has(
                                              slot.scheduledAt,
                                            );

                                            return (
                                              <button
                                                key={slot.scheduledAt}
                                                type="button"
                                                onClick={() =>
                                                  setData({
                                                    ...data,
                                                    scheduledAt: slot.scheduledAt,
                                                  })
                                                }
                                                className={`calendar-time-chip rounded-lg border px-2 py-2 text-center transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                                  active
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : unavailable
                                                      ? "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
                                                      : "border-white/10 bg-[#111612] text-stone-200 hover:bg-white/[0.07]"
                                                }`}
                                              >
                                                <span className="flex items-center justify-center gap-1.5 text-sm font-semibold">
                                                  <Clock className="size-3.5" strokeWidth={1.8} />
                                                  {slot.timeLabel}
                                                </span>
                                                {unavailable && (
                                                  <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.12em] opacity-80">
                                                    Backup
                                                  </span>
                                                )}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          {selectedCoachUnavailable && (
                            <div className="rounded-xl border border-primary/25 bg-primary/10 p-4 text-sm leading-6 text-stone-200">
                              This coach is unavailable for that slot. Submit anyway and we will
                              assign the first available coach.
                            </div>
                          )}
                          <Button
                            type="button"
                            disabled={submitting || !data.requestedPtId || !data.scheduledAt}
                            onClick={submitGuestMeeting}
                            className="kinetic-cta h-12 w-full rounded-xl bg-primary text-primary-foreground transition duration-200 hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
                          >
                            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Request meeting
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {step === 5 && result && (
                    <div className="py-6 text-center">
                      <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground">
                        <CheckCircle2 className="size-8" strokeWidth={1.8} />
                      </div>
                      <h1 className="text-3xl font-semibold tracking-tight text-stone-50">
                        Meeting request received.
                      </h1>
                      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-300">
                        Your meeting is assigned to{" "}
                        <span className="text-primary">{result.assignedPtName}</span>.{" "}
                        {result.emailSent
                          ? "A confirmation email has been sent to your inbox."
                          : "Email delivery is pending SMTP setup, but the coach can see your request."}
                      </p>
                      {result.usedFallback && (
                        <div className="mx-auto mt-5 max-w-md rounded-xl border border-primary/25 bg-primary/10 p-4 text-sm leading-6 text-stone-200">
                          Your selected coach was unavailable, so we assigned the first available
                          coach.
                        </div>
                      )}
                      {result.meetingType === "online" && (
                        <div className="mx-auto mt-5 max-w-md space-y-2 rounded-xl border border-primary/25 bg-primary/10 p-4 text-sm leading-6 text-stone-200">
                          <div className="flex items-center justify-center gap-2 font-medium text-primary">
                            <Video className="size-4" strokeWidth={1.8} /> Online meeting
                          </div>
                          {result.onlineMeetingUrl && (
                            <a
                              href={result.onlineMeetingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block break-all text-primary underline underline-offset-4"
                            >
                              {result.onlineMeetingUrl}
                            </a>
                          )}
                          {result.zaloDeepLink && (
                            <a
                              href={result.zaloDeepLink}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-stone-300 underline underline-offset-4"
                            >
                              Open chat on Zalo
                            </a>
                          )}
                        </div>
                      )}
                      <Button
                        asChild
                        className="kinetic-cta mt-8 rounded-xl bg-primary text-primary-foreground transition duration-200 hover:bg-primary/90 active:scale-[0.98]"
                      >
                        <Link to="/">Back to home</Link>
                      </Button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </KineticSurface>
          </section>
        </main>
      </div>
    </div>
  );
}

function Header({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-stone-50">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-stone-300">{desc}</p>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="rounded-xl text-stone-400 hover:bg-white/[0.06] hover:text-stone-100"
    >
      <ArrowLeft className="mr-2 size-4" strokeWidth={1.8} />
      Back
    </Button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-stone-200">{label}</span>
      {children}
    </label>
  );
}

function buildCalendarDays(slots: SlotOption[]): CalendarDay[] {
  const days = new Map<string, CalendarDay>();

  slots.forEach((slot) => {
    const date = new Date(slot.scheduledAt);
    const key = isValidDate(date) ? formatLocalDateKey(date) : slot.label.split(",")[0];
    const day = days.get(key) ?? {
      key,
      weekday: isValidDate(date)
        ? new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date)
        : key,
      dayNumber: isValidDate(date)
        ? new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(date)
        : "",
      month: isValidDate(date)
        ? new Intl.DateTimeFormat("en-US", { month: "short" }).format(date)
        : "",
      fullLabel: isValidDate(date)
        ? new Intl.DateTimeFormat("en-US", {
            weekday: "short",
            day: "2-digit",
            month: "short",
          }).format(date)
        : key,
      slots: [],
    };

    day.slots.push({ ...slot, timeLabel: formatSlotTime(slot) });
    days.set(key, day);
  });

  return Array.from(days.values());
}

function formatSlotDateTime(scheduledAt: string, fallback: string) {
  const date = new Date(scheduledAt);
  if (!isValidDate(date)) return fallback;

  const day = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);

  return `${day}, ${formatSlotTime({ scheduledAt, label: fallback })}`;
}

function formatSlotTime(slot: SlotOption) {
  const date = new Date(slot.scheduledAt);
  if (isValidDate(date)) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  return slot.label.split(",").at(-1)?.trim() || slot.label;
}

function formatLocalDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}
