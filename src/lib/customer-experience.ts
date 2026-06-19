import type { AppRole } from "@/lib/roles";

const CUSTOMER_NAV_LABELS: Record<string, string> = {
  "/feed": "Today",
  "/log/workout": "Train",
  "/progress-report": "Weekly Report",
  "/trainer": "Coach",
  "/analyses": "Coach Reviews",
};

export function getCustomerNavLabel(role: AppRole | undefined, to: string, label: string) {
  if (role !== "customer") return label;
  return CUSTOMER_NAV_LABELS[to] ?? label;
}

type TodayWorkout = {
  performedAt: string;
};

export type TodayChecklistItem = {
  id: "workout" | "nutrition" | "inbody";
  title: string;
  status: string;
  detail: string;
  href: string;
  cta: string;
  complete: boolean;
};

export function buildTodayChecklist({
  today,
  workouts,
  latestNutritionDate,
  latestInbodyDate,
}: {
  today: string;
  workouts: TodayWorkout[];
  latestNutritionDate?: string | null;
  latestInbodyDate?: string | null;
}): TodayChecklistItem[] {
  const hasWorkoutToday = workouts.some((workout) => workout.performedAt === today);
  const hasNutritionToday = latestNutritionDate === today;
  const inbodyIsRecent = latestInbodyDate ? daysBetween(today, latestInbodyDate) <= 14 : false;

  return [
    {
      id: "workout",
      title: "Training",
      status: hasWorkoutToday ? "Logged today" : "Not logged today",
      detail: hasWorkoutToday
        ? "Your workout is in the system."
        : "Log your session while the details are fresh.",
      href: "/log/workout",
      cta: hasWorkoutToday ? "Add another exercise" : "Log workout",
      complete: hasWorkoutToday,
    },
    {
      id: "nutrition",
      title: "Nutrition",
      status: hasNutritionToday ? "Logged today" : "Not logged today",
      detail: hasNutritionToday
        ? "Alex can use today's meal context."
        : "Add meals or notes for better weekly feedback.",
      href: "/nutrition",
      cta: hasNutritionToday ? "Review meals" : "Log nutrition",
      complete: hasNutritionToday,
    },
    {
      id: "inbody",
      title: "InBody",
      status: inbodyIsRecent ? "Updated recently" : "Needs update",
      detail: inbodyIsRecent
        ? "Your body-composition baseline is current."
        : "Add a recent result when you have one.",
      href: "/inbody",
      cta: inbodyIsRecent ? "View report" : "Add result",
      complete: inbodyIsRecent,
    },
  ];
}

export type WeeklyStreak = {
  sessionsThisWeek: number;
  windowDays: number;
  currentStreak: number;
  percent: number;
};

// Weekly training consistency from recent workout logs. sessionsThisWeek counts
// distinct days trained in the trailing 7-day window (including today);
// currentStreak counts consecutive days with a workout ending today (or
// yesterday, so a not-yet-trained today does not break an active streak).
export function buildWeeklyStreak({
  today,
  workouts,
  windowDays = 7,
}: {
  today: string;
  workouts: TodayWorkout[];
  windowDays?: number;
}): WeeklyStreak {
  const trained = new Set(
    workouts.map((workout) => (workout.performedAt ?? "").slice(0, 10)).filter(Boolean),
  );

  let sessionsThisWeek = 0;
  for (let i = 0; i < windowDays; i += 1) {
    if (trained.has(addDaysYmd(today, -i))) sessionsThisWeek += 1;
  }

  let currentStreak = 0;
  let cursor = trained.has(today) ? today : addDaysYmd(today, -1);
  while (trained.has(cursor)) {
    currentStreak += 1;
    cursor = addDaysYmd(cursor, -1);
  }

  const percent = windowDays > 0 ? Math.round((sessionsThisWeek / windowDays) * 100) : 0;
  return { sessionsThisWeek, windowDays, currentStreak, percent };
}

type BookingEvent = {
  scheduledAt: string;
  status: string;
  durationMinutes?: number | null;
};

type ClassEvent = {
  title: string;
  startsAt: string;
  durationMinutes?: number | null;
  myBooking?: { status: string } | null;
};

export type NextCustomerEvent = {
  kind: "booking" | "class";
  title: string;
  startsAt: string;
  status: string;
  href: "/bookings" | "/classes";
  durationMinutes?: number | null;
};

export function getNextCustomerEvent({
  nowIso,
  bookings,
  classes,
}: {
  nowIso: string;
  bookings: BookingEvent[];
  classes: ClassEvent[];
}): NextCustomerEvent | null {
  const now = new Date(nowIso).getTime();
  const candidates: NextCustomerEvent[] = [
    ...bookings
      .filter((booking) => isUpcoming(booking.scheduledAt, now))
      .filter((booking) => ["pending", "confirmed", "rescheduled"].includes(booking.status))
      .map((booking) => ({
        kind: "booking" as const,
        title: "PT session",
        startsAt: booking.scheduledAt,
        status: booking.status,
        href: "/bookings" as const,
        durationMinutes: booking.durationMinutes,
      })),
    ...classes
      .filter((item) => item.myBooking?.status === "booked")
      .filter((item) => isUpcoming(item.startsAt, now))
      .map((item) => ({
        kind: "class" as const,
        title: item.title,
        startsAt: item.startsAt,
        status: item.myBooking?.status ?? "booked",
        href: "/classes" as const,
        durationMinutes: item.durationMinutes,
      })),
  ];

  candidates.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  return candidates[0] ?? null;
}

export type ProfileSetupDraft = {
  goal?: string | number | null;
  level?: string | number | null;
  age?: string | number | null;
  gender?: string | number | null;
  heightCm?: string | number | null;
  weightKg?: string | number | null;
  targetWeightKg?: string | number | null;
  limitations?: string | number | null;
};

export type ProfileSetupItem = {
  id: "training" | "body" | "safety";
  title: string;
  status: string;
  detail: string;
  missing: string[];
  complete: boolean;
};

export function buildProfileSetupSummary(profile: ProfileSetupDraft): {
  items: ProfileSetupItem[];
  completedCount: number;
  totalCount: number;
  percent: number;
} {
  const items: ProfileSetupItem[] = [
    buildSetupItem({
      id: "training",
      title: "Training goal",
      completeStatus: "Ready for plan generation",
      incompleteStatus: "Needs goal and level",
      completeDetail: "Alex can shape plan advice around your direction and experience.",
      incompleteDetail: "Add your main goal and current training level first.",
      missing: [
        ["goal", profile.goal],
        ["training level", profile.level],
      ],
    }),
    buildSetupItem({
      id: "body",
      title: "Body baseline",
      completeStatus: "Baseline complete",
      incompleteStatus: "Needs body baseline",
      completeDetail: "Weight, height, and target are ready for progress context.",
      incompleteDetail: "Add your body stats so progress advice has a real baseline.",
      missing: [
        ["age", profile.age],
        ["height", profile.heightCm],
        ["current weight", profile.weightKg],
        ["target weight", profile.targetWeightKg],
      ],
    }),
    buildSetupItem({
      id: "safety",
      title: "Limitations",
      completeStatus: "Coach context saved",
      incompleteStatus: "Needs safety context",
      completeDetail: "Pain, injury, or limitation notes can guide safer suggestions.",
      incompleteDetail: "Add injuries, limitations, or write none.",
      missing: [["limitations", profile.limitations]],
    }),
  ];
  const completedCount = items.filter((item) => item.complete).length;
  const totalCount = items.length;

  return {
    items,
    completedCount,
    totalCount,
    percent: Math.round((completedCount / totalCount) * 100),
  };
}

type WorkoutQuickRow = {
  performedAt?: string | null;
  dayLabel?: string | null;
  muscleGroup?: string | null;
  exercise?: string | null;
  sets?: number | null;
  reps?: string | null;
  weightKg?: number | null;
  notes?: string | null;
};

export type WorkoutQuickPatch = {
  dayLabel: string;
  muscleGroup: string;
  exercise: string;
  sets: string;
  reps: string;
  weightKg: string;
  notes: string;
};

export type WorkoutQuickAction = {
  label: string;
  patch: WorkoutQuickPatch;
};

export function buildWorkoutQuickActions(
  rows: WorkoutQuickRow[],
  limit = 4,
): {
  repeatLatest: WorkoutQuickAction | null;
  recentExercises: WorkoutQuickAction[];
} {
  const validRows = rows.filter((row) => row.exercise?.trim());
  const latest = validRows[0] ?? null;
  const seen = new Set<string>();
  const recentExercises: WorkoutQuickAction[] = [];

  for (const row of validRows) {
    const exercise = row.exercise?.trim();
    if (!exercise) continue;
    const key = exercise.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recentExercises.push({ label: exercise, patch: toWorkoutPatch(row) });
    if (recentExercises.length >= limit) break;
  }

  return {
    repeatLatest: latest
      ? {
          label: `Repeat ${latest.exercise?.trim()}`,
          patch: toWorkoutPatch(latest),
        }
      : null,
    recentExercises,
  };
}

type BookingExperienceRow = {
  id: string;
  status: string;
  scheduledAt: string;
  durationMinutes?: number | null;
  notes?: string | null;
};

type BookingPtOption = {
  id: string;
  displayName: string;
  email: string;
};

export type BookingCoachOption = {
  id: string;
  label: string;
  detail: string;
};

export function buildBookingExperience({
  nowIso,
  bookings,
  pts,
}: {
  nowIso: string;
  bookings: BookingExperienceRow[];
  pts: BookingPtOption[];
}): {
  upcoming: BookingExperienceRow[];
  history: BookingExperienceRow[];
  nextBooking: BookingExperienceRow | null;
  coachOptions: BookingCoachOption[];
} {
  const now = new Date(nowIso).getTime();
  const upcoming = bookings
    .filter((booking) => isActiveBooking(booking.status))
    .filter((booking) => isUpcoming(booking.scheduledAt, now))
    .sort(sortByScheduledAtAsc);
  const history = bookings
    .filter((booking) => !upcoming.some((item) => item.id === booking.id))
    .sort(sortByScheduledAtDesc);

  return {
    upcoming,
    history,
    nextBooking: upcoming[0] ?? null,
    coachOptions: [
      {
        id: "auto",
        label: "Best available coach",
        detail: "Use your assigned coach or the first available PT.",
      },
      ...pts.map((pt) => ({
        id: pt.id,
        label: pt.displayName,
        detail: pt.email,
      })),
    ],
  };
}

type ProgressWorkoutRow = {
  performedAt: string;
  sets?: number | null;
  reps?: string | null;
  weightKg?: number | null;
};

type ProgressInbodyRow = {
  reportDate: string;
  weightKg: number;
  muscleMassKg?: number | null;
  bodyFatPercent?: number | null;
};

type ProgressNutritionRow = {
  reportDate: string;
};

export type ProgressExperience = {
  weekSessions: number;
  monthSessions: number;
  weekVolumeKg: number;
  nutritionLogsThisWeek: number;
  photoSlotsRemaining: number;
  analysisReady: boolean;
  latestInbody: ProgressInbodyRow | null;
  weightTrend: {
    label: string;
    direction: "down" | "up" | "flat" | "none";
    detail: string;
  };
};

export function buildProgressExperience({
  today,
  workouts,
  inbodyReports,
  nutritionReports,
  photoCount,
}: {
  today: string;
  workouts: ProgressWorkoutRow[];
  inbodyReports: ProgressInbodyRow[];
  nutritionReports: ProgressNutritionRow[];
  photoCount: number;
}): ProgressExperience {
  const weekStart = addDaysYmd(today, -6);
  const monthStart = addDaysYmd(today, -29);
  const weekWorkouts = workouts.filter((workout) =>
    isDateWithin(workout.performedAt, weekStart, today),
  );
  const monthWorkouts = workouts.filter((workout) =>
    isDateWithin(workout.performedAt, monthStart, today),
  );
  const nutritionLogsThisWeek = new Set(
    nutritionReports
      .filter((report) => isDateWithin(report.reportDate, weekStart, today))
      .map((report) => report.reportDate),
  ).size;
  const latestInbody = inbodyReports[0] ?? null;

  return {
    weekSessions: countUniqueDates(weekWorkouts.map((workout) => workout.performedAt)),
    monthSessions: countUniqueDates(monthWorkouts.map((workout) => workout.performedAt)),
    weekVolumeKg: Math.round(calculateWorkoutVolume(weekWorkouts)),
    nutritionLogsThisWeek,
    photoSlotsRemaining: Math.max(0, 4 - photoCount),
    analysisReady:
      countUniqueDates(weekWorkouts.map((workout) => workout.performedAt)) >= 2 ||
      nutritionLogsThisWeek >= 2,
    latestInbody,
    weightTrend: buildWeightTrend(inbodyReports),
  };
}

type NutritionExperienceRow = {
  reportDate: string;
  dayType?: string | null;
  breakfast?: string | null;
  lunch?: string | null;
  dinner?: string | null;
  snacks?: string | null;
  preWorkoutMeal?: string | null;
  postWorkoutMeal?: string | null;
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatsG?: number | null;
  notes?: string | null;
};

type MacroAverages = {
  calories: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatsG: number | null;
};

export type NutritionMealSummary = {
  label: string;
  value: string;
};

export function buildNutritionExperience({
  today,
  reports,
}: {
  today: string;
  reports: NutritionExperienceRow[];
}) {
  const sorted = [...reports].sort(sortByReportDateDesc);
  const latest = sorted[0] ?? null;
  const todayReport = sorted.find((report) => report.reportDate === today) ?? null;
  const weekStart = addDaysYmd(today, -6);
  const weekReports = sorted.filter((report) => isDateWithin(report.reportDate, weekStart, today));
  const weekLogCount = countUniqueDates(weekReports.map((report) => report.reportDate));

  return {
    hasAnyLog: sorted.length > 0,
    todayLogged: Boolean(todayReport),
    latest,
    todayReport,
    weekLogCount,
    latestMeals: latest ? summarizeNutritionMeals(latest) : [],
    latestMacros: latest ? getMacroValues(latest) : emptyMacros(),
    averageMacros: averageMacros(weekReports),
  };
}

function summarizeNutritionMeals(row: NutritionExperienceRow): NutritionMealSummary[] {
  return [
    { label: "Breakfast", value: row.breakfast },
    { label: "Lunch", value: row.lunch },
    { label: "Dinner", value: row.dinner },
    { label: "Snacks", value: row.snacks },
    { label: "Pre-workout", value: row.preWorkoutMeal },
    { label: "Post-workout", value: row.postWorkoutMeal },
  ]
    .filter((item): item is { label: string; value: string } => Boolean(item.value?.trim()))
    .map((item) => ({ label: item.label, value: item.value.trim() }));
}

function getMacroValues(row: NutritionExperienceRow): MacroAverages {
  return {
    calories: finiteOrNull(row.calories),
    proteinG: finiteOrNull(row.proteinG),
    carbsG: finiteOrNull(row.carbsG),
    fatsG: finiteOrNull(row.fatsG),
  };
}

function emptyMacros(): MacroAverages {
  return {
    calories: null,
    proteinG: null,
    carbsG: null,
    fatsG: null,
  };
}

function averageMacros(rows: NutritionExperienceRow[]): MacroAverages {
  return {
    calories: averageMacroField(rows, "calories"),
    proteinG: averageMacroField(rows, "proteinG"),
    carbsG: averageMacroField(rows, "carbsG"),
    fatsG: averageMacroField(rows, "fatsG"),
  };
}

function averageMacroField(rows: NutritionExperienceRow[], key: keyof MacroAverages) {
  const values = rows.map((row) => finiteOrNull(row[key])).filter((value) => value !== null);
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

type InbodyExperienceRow = {
  id?: string | null;
  reportDate: string;
  weightKg: number;
  muscleMassKg: number;
  bodyFatPercent: number;
};

type TrendDirection = "up" | "down" | "flat" | "none";

export type InbodyDelta = {
  label: string;
  value: number | null;
  direction: TrendDirection;
  unit: "kg" | "%";
};

export function buildInbodyExperience(reports: InbodyExperienceRow[]) {
  const sorted = [...reports].sort(sortByReportDateDesc);
  const latest = sorted[0] ?? null;
  const previous = sorted[1] ?? null;

  return {
    hasReports: sorted.length > 0,
    baselineLabel: latest ? "Latest baseline" : "No baseline yet",
    latest,
    previous,
    deltas: {
      weightKg: buildInbodyDelta("Weight", latest?.weightKg, previous?.weightKg, "kg"),
      muscleMassKg: buildInbodyDelta("Muscle", latest?.muscleMassKg, previous?.muscleMassKg, "kg"),
      bodyFatPercent: buildInbodyDelta(
        "Body fat",
        latest?.bodyFatPercent,
        previous?.bodyFatPercent,
        "%",
      ),
    },
    history: sorted,
  };
}

function buildInbodyDelta(
  label: string,
  latest: number | undefined,
  previous: number | undefined,
  unit: "kg" | "%",
): InbodyDelta {
  if (!Number.isFinite(latest) || !Number.isFinite(previous)) {
    return { label, value: null, direction: "none", unit };
  }
  const value = roundToOne((latest ?? 0) - (previous ?? 0));
  return {
    label,
    value,
    direction: value > 0 ? "up" : value < 0 ? "down" : "flat",
    unit,
  };
}

type PlanSummaryRow = {
  id: string;
  planDate: string;
  title?: string | null;
  contentMd: string;
  createdAt?: string | null;
};

export function selectActivePlan<TPlan extends PlanSummaryRow>({
  today,
  plans,
}: {
  today: string;
  plans: TPlan[];
}): TPlan | null {
  if (plans.length === 0) return null;
  const sorted = [...plans].sort((a, b) => {
    const dateDiff = b.planDate.localeCompare(a.planDate);
    if (dateDiff !== 0) return dateDiff;
    return String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
  });
  return sorted.find((plan) => plan.planDate <= today) ?? sorted[0] ?? null;
}

type ClassDiscoverySession = {
  sessionId: string;
  classId: string;
  title: string;
  description?: string | null;
  level?: string | null;
  startsAt: string;
  durationMinutes: number;
  capacity: number;
  status: string;
  bookedCount: number;
  seatsLeft: number;
  myBooking?: { id: string; status: string } | null;
};

export type ClassDiscoveryItem = ClassDiscoverySession & {
  isBooked: boolean;
  isUpcoming: boolean;
  isFull: boolean;
  capacityPercent: number;
  capacityLabel: string;
  capacityTone: "open" | "tight" | "full" | "booked" | "closed";
};

export function buildClassDiscovery({
  nowIso,
  sessions,
}: {
  nowIso: string;
  sessions: ClassDiscoverySession[];
}) {
  const now = new Date(nowIso).getTime();
  const decorated = sessions.map((session) => decorateClassSession(session, now));
  const upcoming = decorated
    .filter((session) => session.isUpcoming)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return {
    bookedUpcoming: upcoming.filter((session) => session.isBooked),
    availableUpcoming: upcoming.filter(
      (session) => !session.isBooked && !session.isFull && session.status === "scheduled",
    ),
    unavailable: upcoming.filter(
      (session) => !session.isBooked && (session.isFull || session.status !== "scheduled"),
    ),
    past: decorated
      .filter((session) => !session.isUpcoming)
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()),
  };
}

function decorateClassSession(session: ClassDiscoverySession, now: number): ClassDiscoveryItem {
  const isBooked = session.myBooking?.status === "booked";
  const isUpcomingSession = isUpcoming(session.startsAt, now);
  const isFull = session.seatsLeft <= 0 || session.bookedCount >= session.capacity;
  const capacityPercent =
    session.capacity > 0
      ? Math.min(100, Math.round((session.bookedCount / session.capacity) * 100))
      : 0;
  const capacityTone = getCapacityTone({ isBooked, isFull, seatsLeft: session.seatsLeft });

  return {
    ...session,
    isBooked,
    isUpcoming: isUpcomingSession,
    isFull,
    capacityPercent,
    capacityLabel: isFull
      ? "Class full"
      : `${session.seatsLeft} seat${session.seatsLeft === 1 ? "" : "s"} left`,
    capacityTone,
  };
}

function getCapacityTone({
  isBooked,
  isFull,
  seatsLeft,
}: {
  isBooked: boolean;
  isFull: boolean;
  seatsLeft: number;
}): ClassDiscoveryItem["capacityTone"] {
  if (isBooked) return "booked";
  if (isFull) return "full";
  if (seatsLeft <= 3) return "tight";
  return "open";
}

type AnalysisSummaryRow = {
  id: string;
  planDate: string;
  contentMd: string;
  createdAt?: string | null;
};

export type WeeklyCheckInItem = {
  id: "training" | "nutrition" | "inbody" | "plan" | "photos";
  title: string;
  status: string;
  detail: string;
  href: string;
  complete: boolean;
};

export function buildWeeklyCheckIn({
  today,
  workouts,
  nutritionReports,
  inbodyReports,
  photoCount,
  plans,
  analyses,
}: {
  today: string;
  workouts: ProgressWorkoutRow[];
  nutritionReports: ProgressNutritionRow[];
  inbodyReports: ProgressInbodyRow[];
  photoCount: number;
  plans: PlanSummaryRow[];
  analyses: AnalysisSummaryRow[];
}) {
  const progress = buildProgressExperience({
    today,
    workouts,
    inbodyReports,
    nutritionReports,
    photoCount,
  });
  const activePlan = selectActivePlan({ today, plans });
  const latestAnalysis = [...analyses].sort(sortAnalysisDesc)[0] ?? null;
  const inbodyIsRecent = progress.latestInbody
    ? daysBetween(today, progress.latestInbody.reportDate) <= 14
    : false;

  return {
    progress,
    activePlan,
    latestAnalysis,
    items: [
      {
        id: "training",
        title: "Training",
        status:
          progress.weekSessions >= 2
            ? `${progress.weekSessions} sessions logged`
            : `${progress.weekSessions} session${progress.weekSessions === 1 ? "" : "s"} logged`,
        detail:
          progress.weekSessions >= 2
            ? "Enough training signal for a useful check-in."
            : "Log two sessions to make next week's review stronger.",
        href: "/log/workout",
        complete: progress.weekSessions >= 2,
      },
      {
        id: "nutrition",
        title: "Nutrition",
        status: `${progress.nutritionLogsThisWeek} day${
          progress.nutritionLogsThisWeek === 1 ? "" : "s"
        } logged`,
        detail:
          progress.nutritionLogsThisWeek >= 2
            ? "Alex can compare food context with training output."
            : "Add two meal logs to connect fuel and progress.",
        href: "/nutrition",
        complete: progress.nutritionLogsThisWeek >= 2,
      },
      {
        id: "inbody",
        title: "InBody",
        status: inbodyIsRecent ? "Recent baseline ready" : "Baseline needs update",
        detail: inbodyIsRecent
          ? "Body-composition context is current."
          : "Add a recent result if you have one.",
        href: "/inbody",
        complete: inbodyIsRecent,
      },
      {
        id: "plan",
        title: "Plan",
        status: activePlan ? "Active plan found" : "No saved plan",
        detail: activePlan
          ? `${activePlan.title || "Saved plan"} is ready for review.`
          : "Generate or save a plan so the check-in has a target.",
        href: "/plans",
        complete: Boolean(activePlan),
      },
      {
        id: "photos",
        title: "Photos",
        status: `${photoCount} photo${photoCount === 1 ? "" : "s"} saved`,
        detail:
          photoCount >= 2
            ? "Visual comparison is ready."
            : "Add at least two photos for side-by-side progress context.",
        href: "/progress",
        complete: photoCount >= 2,
      },
    ] satisfies WeeklyCheckInItem[],
  };
}

export function getTrainerPromptFromSearch(search: string) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return (params.get("prompt") ?? "").trim();
}

function sortByReportDateDesc<T extends { reportDate: string }>(a: T, b: T) {
  return b.reportDate.localeCompare(a.reportDate);
}

function sortAnalysisDesc(a: AnalysisSummaryRow, b: AnalysisSummaryRow) {
  const createdDiff = String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""));
  if (createdDiff !== 0) return createdDiff;
  return b.planDate.localeCompare(a.planDate);
}

function finiteOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function roundToOne(value: number) {
  return Math.round(value * 10) / 10;
}

function isUpcoming(iso: string, now: number) {
  const time = new Date(iso).getTime();
  return Number.isFinite(time) && time >= now;
}

function daysBetween(today: string, compare: string) {
  const todayTime = parseDateOnly(today);
  const compareTime = parseDateOnly(compare);
  if (!Number.isFinite(todayTime) || !Number.isFinite(compareTime)) return Number.POSITIVE_INFINITY;
  return Math.abs(todayTime - compareTime) / 86_400_000;
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return Number.NaN;
  return Date.UTC(year, month - 1, day);
}

function buildSetupItem({
  id,
  title,
  completeStatus,
  incompleteStatus,
  completeDetail,
  incompleteDetail,
  missing,
}: {
  id: ProfileSetupItem["id"];
  title: string;
  completeStatus: string;
  incompleteStatus: string;
  completeDetail: string;
  incompleteDetail: string;
  missing: Array<[string, string | number | null | undefined]>;
}): ProfileSetupItem {
  const missingLabels = missing.filter(([, value]) => !hasValue(value)).map(([label]) => label);
  const complete = missingLabels.length === 0;

  return {
    id,
    title,
    complete,
    missing: missingLabels,
    status: complete ? completeStatus : incompleteStatus,
    detail: complete ? completeDetail : incompleteDetail,
  };
}

function hasValue(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value);
  return Boolean(value?.trim());
}

function toWorkoutPatch(row: WorkoutQuickRow): WorkoutQuickPatch {
  return {
    dayLabel: row.dayLabel ?? "",
    muscleGroup: row.muscleGroup ?? "",
    exercise: row.exercise?.trim() ?? "",
    sets: row.sets ? String(row.sets) : "",
    reps: row.reps ?? "",
    weightKg: typeof row.weightKg === "number" ? String(row.weightKg) : "",
    notes: "",
  };
}

function isActiveBooking(status: string) {
  return ["pending", "confirmed", "rescheduled"].includes(status);
}

function sortByScheduledAtAsc(a: BookingExperienceRow, b: BookingExperienceRow) {
  return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
}

function sortByScheduledAtDesc(a: BookingExperienceRow, b: BookingExperienceRow) {
  return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
}

function addDaysYmd(ymd: string, days: number) {
  const time = parseDateOnly(ymd);
  if (!Number.isFinite(time)) return ymd;
  const date = new Date(time);
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function isDateWithin(ymd: string, startYmd: string, endYmd: string) {
  return ymd >= startYmd && ymd <= endYmd;
}

function countUniqueDates(dates: string[]) {
  return new Set(dates).size;
}

function calculateWorkoutVolume(workouts: ProgressWorkoutRow[]) {
  return workouts.reduce((sum, workout) => {
    const sets = workout.sets ?? 0;
    const reps = parseAverageReps(workout.reps ?? null) ?? 0;
    const weight = workout.weightKg ?? 0;
    return sum + sets * reps * weight;
  }, 0);
}

function parseAverageReps(value: string | null) {
  if (!value) return null;
  const numbers =
    value
      .match(/\d+(?:\.\d+)?/g)
      ?.map(Number)
      .filter(Number.isFinite) ?? [];
  if (numbers.length === 0) return null;
  if (numbers.length === 1) return numbers[0] ?? null;
  return ((numbers[0] ?? 0) + (numbers[1] ?? 0)) / 2;
}

function buildWeightTrend(inbodyReports: ProgressInbodyRow[]): ProgressExperience["weightTrend"] {
  const latest = inbodyReports[0];
  const previous = inbodyReports[1];
  if (!latest || !previous) {
    return {
      label: latest ? `${formatNumber(latest.weightKg)}kg current` : "No InBody yet",
      direction: "none",
      detail: latest ? "Add another report to see a trend" : "Add a report to start tracking",
    };
  }

  const diff = latest.weightKg - previous.weightKg;
  const abs = Math.abs(diff);
  if (abs < 0.05) {
    return {
      label: "Stable",
      direction: "flat",
      detail: `Since ${formatShortDate(previous.reportDate)}`,
    };
  }

  return {
    label: `${diff < 0 ? "Down" : "Up"} ${formatNumber(abs)}kg`,
    direction: diff < 0 ? "down" : "up",
    detail: `Since ${formatShortDate(previous.reportDate)}`,
  };
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatShortDate(ymd: string) {
  const time = parseDateOnly(ymd);
  if (!Number.isFinite(time)) return ymd;
  const date = new Date(time);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${String(date.getUTCDate()).padStart(2, "0")} ${months[date.getUTCMonth()]}`;
}
