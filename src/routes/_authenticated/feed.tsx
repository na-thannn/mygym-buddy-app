import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Scale,
  Sparkles,
  User,
  Utensils,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/authContext";
import {
  buildTodayChecklist,
  getNextCustomerEvent,
  type NextCustomerEvent,
  type TodayChecklistItem,
} from "@/lib/customer-experience";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Today - HL Fitness" }] }),
  component: Feed,
});

type Post = {
  id: string;
  authorName?: string;
  content: string;
  imageBase64?: string | null;
  likesCount?: number;
  createdAt: string;
};

type WorkoutRow = {
  id: string;
  performedAt: string;
  exercise: string;
};

type NutritionRow = {
  reportDate: string;
  calories?: number | null;
  proteinG?: number | null;
};

type InbodyRow = {
  reportDate: string;
  weightKg: number;
  muscleMassKg: number;
  bodyFatPercent: number;
};

type BookingRow = {
  scheduledAt: string;
  status: string;
  durationMinutes?: number | null;
};

type ClassSession = {
  title: string;
  startsAt: string;
  durationMinutes?: number | null;
  myBooking?: { status: string } | null;
};

type TodayData = {
  workouts: WorkoutRow[];
  nutrition: NutritionRow[];
  inbody: InbodyRow[];
  bookings: BookingRow[];
  classes: ClassSession[];
};

const EMPTY_TODAY: TodayData = {
  workouts: [],
  nutrition: [],
  inbody: [],
  bookings: [],
  classes: [],
};

const CHECKLIST_ICONS = {
  workout: Dumbbell,
  nutrition: Utensils,
  inbody: Scale,
} satisfies Record<TodayChecklistItem["id"], typeof Dumbbell>;

function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState("");
  const [busy, setBusy] = useState(false);
  const [todayBusy, setTodayBusy] = useState(false);
  const [todayData, setTodayData] = useState<TodayData>(EMPTY_TODAY);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const isCustomer = user?.role === "customer";
  const today = new Date().toISOString().slice(0, 10);

  const fetchPosts = async () => {
    const res = await fetch("/api/feed", { credentials: "include" });
    if (!res.ok) return [];
    return res.json();
  };

  const load = useCallback(async () => {
    try {
      const rows = await fetchPosts();
      setPosts(rows as Post[]);
    } catch (err) {
      toast.error("Failed to load feed");
    }
  }, []);

  const loadToday = useCallback(async () => {
    setTodayBusy(true);
    try {
      const [workoutsRes, nutritionRes, inbodyRes, bookingsRes, classesRes] = await Promise.all([
        fetch("/api/log/workout?limit=20", { credentials: "include" }),
        fetch("/api/log/nutrition-report", { credentials: "include" }),
        fetch("/api/inbody", { credentials: "include" }),
        fetch("/api/bookings", { credentials: "include" }),
        fetch("/api/classes", { credentials: "include" }),
      ]);

      const workouts = workoutsRes.ok ? ((await workoutsRes.json()) as WorkoutRow[]) : [];
      const nutrition = nutritionRes.ok ? ((await nutritionRes.json()) as NutritionRow[]) : [];
      const inbody = inbodyRes.ok ? ((await inbodyRes.json()) as InbodyRow[]) : [];
      const bookings = bookingsRes.ok ? ((await bookingsRes.json()) as BookingRow[]) : [];
      const classesBody = classesRes.ok
        ? ((await classesRes.json()) as { sessions?: ClassSession[] })
        : { sessions: [] };

      setTodayData({
        workouts,
        nutrition,
        inbody,
        bookings,
        classes: classesBody.sessions ?? [],
      });
    } catch (err) {
      toast.error("Failed to load today's summary");
    } finally {
      setTodayBusy(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isCustomer) return;
    loadToday();
  }, [isCustomer, loadToday]);

  const checklist = useMemo(
    () =>
      buildTodayChecklist({
        today,
        workouts: todayData.workouts,
        latestNutritionDate: todayData.nutrition[0]?.reportDate,
        latestInbodyDate: todayData.inbody[0]?.reportDate,
      }),
    [today, todayData.inbody, todayData.nutrition, todayData.workouts],
  );

  const nextEvent = useMemo(
    () =>
      getNextCustomerEvent({
        nowIso: new Date().toISOString(),
        bookings: todayData.bookings,
        classes: todayData.classes,
      }),
    [todayData.bookings, todayData.classes],
  );

  const todayWorkouts = useMemo(
    () => todayData.workouts.filter((workout) => workout.performedAt === today),
    [today, todayData.workouts],
  );

  const handlePost = async (imageBase64?: string | null) => {
    if (!newPost.trim() && !imageBase64) return;
    setBusy(true);
    try {
      await fetch("/api/feed", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: newPost.trim() || "", imageBase64: imageBase64 ?? null }),
      });
      setNewPost("");
      await load();
      toast.success("Posted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Post failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={
        isCustomer ? "mx-auto max-w-6xl p-4 pb-24 md:p-6" : "mx-auto max-w-2xl p-4 pb-24 md:p-6"
      }
    >
      <PageHeader
        title={isCustomer ? "Today" : "Community Feed"}
        description={
          isCustomer
            ? "Your next session, daily logs, and coach prompts in one place."
            : "See what's happening at HL Fitness, 303 Le Thanh Nghi"
        }
        action={
          isCustomer ? (
            <Button
              asChild
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/trainer">
                Ask Alex <MessageCircle className="ml-2 size-4" />
              </Link>
            </Button>
          ) : undefined
        }
      />

      {isCustomer && (
        <TodayDashboard
          busy={todayBusy}
          checklist={checklist}
          nextEvent={nextEvent}
          todayWorkouts={todayWorkouts}
          latestNutrition={todayData.nutrition[0] ?? null}
          latestInbody={todayData.inbody[0] ?? null}
        />
      )}

      <section className={isCustomer ? "mt-10 max-w-2xl" : ""}>
        {isCustomer && (
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-tight text-stone-50">Community</h2>
            <p className="mt-1 text-sm text-stone-400">
              Share the small wins that make training easier to keep doing.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-4 shadow-xl">
          <div className="flex items-start gap-4">
            <div className="grid size-10 flex-shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <User className="size-5" />
            </div>
            <div className="flex-1">
              <textarea
                placeholder="Share your workout, new PR, or progress..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="min-h-[60px] w-full resize-none rounded-lg border-none bg-transparent pt-1 text-sm leading-6 text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3 border-t border-white/5 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 4 * 1024 * 1024) {
                    toast.error("Image too large, maximum 4MB");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                    const base64 = ev.target?.result as string;
                    await handlePost(base64);
                  };
                  reader.readAsDataURL(file);
                  e.currentTarget.value = "";
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-slate-400 hover:bg-primary/10 hover:text-primary"
                onClick={() => fileRef.current?.click()}
              >
                <ImageIcon className="mr-2 size-4" /> Add photo
              </Button>
              <div className="text-xs text-slate-400">Optional image or text post</div>
            </div>
            <Button
              onClick={() => handlePost(null)}
              size="sm"
              disabled={busy}
              className="rounded-xl bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : "Post"}
            </Button>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {posts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                <MessageCircle className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-stone-100">
                No community posts yet
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-400">
                Post a training win, a question, or a progress note to start the feed.
              </p>
            </div>
          )}

          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl border border-white/10 bg-black/30 p-5 animate-fade-up"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 flex-shrink-0 place-items-center rounded-xl bg-slate-800 text-sm font-bold text-slate-300">
                    {post.authorName?.charAt(0) ?? "U"}
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-slate-200">
                      {post.authorName ?? "Unknown member"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(post.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-slate-300"
                  aria-label="Post options"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </div>
              {post.content && (
                <p className="mt-4 text-sm leading-relaxed text-slate-300">{post.content}</p>
              )}
              {post.imageBase64 && (
                <div className="mt-3 overflow-hidden rounded-xl">
                  <img
                    src={post.imageBase64}
                    alt="Community upload"
                    className="h-auto w-full rounded-xl object-cover"
                  />
                </div>
              )}
              <div className="mt-5 border-t border-white/5 pt-3 text-sm text-slate-400">
                {post.likesCount ?? 0} likes
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TodayDashboard({
  busy,
  checklist,
  nextEvent,
  todayWorkouts,
  latestNutrition,
  latestInbody,
}: {
  busy: boolean;
  checklist: TodayChecklistItem[];
  nextEvent: NextCustomerEvent | null;
  todayWorkouts: WorkoutRow[];
  latestNutrition: NutritionRow | null;
  latestInbody: InbodyRow | null;
}) {
  const completeCount = checklist.filter((item) => item.complete).length;

  return (
    <section className="grid gap-4 lg:grid-cols-[1.18fr_0.82fr]">
      <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5 shadow-[0_28px_80px_-62px_rgba(244,179,43,0.75)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <Sparkles className="size-4" />
              Daily training loop
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-50 md:text-3xl">
              Keep today simple.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-stone-300">
              Log the essentials, check the next commitment, and use Alex when you want a second
              look.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-stone-300">
            <span className="font-semibold text-stone-50">{completeCount}</span> /{" "}
            {checklist.length} done
          </div>
        </div>

        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${(completeCount / checklist.length) * 100}%` }}
          />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {checklist.map((item) => {
            const Icon = CHECKLIST_ICONS[item.id];
            return (
              <Link
                key={item.id}
                to={item.href}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="size-5" />
                  </div>
                  {item.complete && <CheckCircle2 className="size-5 text-primary" />}
                </div>
                <h3 className="mt-4 text-base font-semibold text-stone-50">{item.title}</h3>
                <div className="mt-1 text-xs font-medium text-primary">{item.status}</div>
                <p className="mt-2 min-h-10 text-sm leading-5 text-stone-400">{item.detail}</p>
                <div className="mt-4 flex items-center text-sm font-medium text-stone-200">
                  {item.cta}
                  <ArrowRight className="ml-2 size-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#111612]/95 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-stone-400">Next commitment</div>
              {busy ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-stone-400">
                  <Loader2 className="size-4 animate-spin" />
                  Loading schedule
                </div>
              ) : nextEvent ? (
                <>
                  <h3 className="mt-2 text-xl font-semibold text-stone-50">{nextEvent.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-300">
                    {new Intl.DateTimeFormat("en-US", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(nextEvent.startsAt))}
                    {nextEvent.durationMinutes ? `, ${nextEvent.durationMinutes} min` : ""}
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    className="mt-4 rounded-xl border-white/10 bg-white/[0.04] text-stone-100 hover:bg-white/[0.08]"
                  >
                    <Link to={nextEvent.href}>View details</Link>
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="mt-2 text-xl font-semibold text-stone-50">Nothing booked yet</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-300">
                    Book a PT session or group class when you are ready for the next anchor.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      asChild
                      size="sm"
                      className="rounded-xl bg-primary text-primary-foreground"
                    >
                      <Link to="/bookings">Book PT</Link>
                    </Button>
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="rounded-xl border-white/10 bg-white/[0.04] text-stone-100"
                    >
                      <Link to="/classes">View classes</Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <CalendarDays className="size-5" />
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <SnapshotCard
            title="Training today"
            value={
              todayWorkouts.length
                ? `${todayWorkouts.length} exercise${todayWorkouts.length === 1 ? "" : "s"}`
                : "No log yet"
            }
            detail={todayWorkouts[0]?.exercise ?? "Start with the first set."}
          />
          <SnapshotCard
            title="Latest nutrition"
            value={latestNutrition ? formatDate(latestNutrition.reportDate) : "No log yet"}
            detail={
              latestNutrition?.calories
                ? `${Math.round(latestNutrition.calories)} kcal, ${Math.round(latestNutrition.proteinG ?? 0)}g protein`
                : "Meals help Alex read your week."
            }
          />
          <SnapshotCard
            title="Latest InBody"
            value={latestInbody ? formatDate(latestInbody.reportDate) : "No report yet"}
            detail={
              latestInbody
                ? `${latestInbody.weightKg}kg, ${latestInbody.bodyFatPercent}% body fat`
                : "Add a scan to track body composition."
            }
          />
        </div>
      </div>
    </section>
  );
}

function SnapshotCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="text-xs text-stone-400">{title}</div>
      <div className="mt-1 text-base font-semibold text-stone-50">{value}</div>
      <div className="mt-1 text-xs leading-5 text-stone-400">{detail}</div>
    </div>
  );
}
