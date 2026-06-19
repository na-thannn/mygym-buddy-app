import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
  Apple,
  ArrowRight,
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Dumbbell,
  Flame,
  Gift,
  LineChart,
  MapPin,
  MessageCircle,
  Scale,
  ShieldCheck,
  Ticket,
  Timer,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FixedSnapScroller,
  KineticSurface,
  MotionSection,
  OptimizedPicture,
} from "@/components/motion/public-funnel-motion";
import { useFixedSnapNavigation } from "@/components/motion/public-funnel-navigation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HL Fitness - 303 Le Thanh Nghi training platform" },
      {
        name: "description",
        content:
          "HL Fitness at 303 Le Thanh Nghi. Track InBody, workouts, nutrition, AI Coach, and real trainers.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Scale,
    title: "InBody Tracking",
    desc: "Upload reports and see body composition move over time.",
    className: "lg:col-span-2",
    image: "/redesign/inbody-progress.png",
  },
  {
    icon: Dumbbell,
    title: "Workout Log",
    desc: "Record sets, reps, load, and training notes without leaving the floor.",
  },
  {
    icon: Apple,
    title: "Nutrition Log",
    desc: "Keep meals, calories, and macro estimates in one daily view.",
  },
  {
    icon: MessageCircle,
    title: "AI Coach",
    desc: "Ask for plan feedback, weekly analysis, and next-session guidance.",
  },
  {
    icon: LineChart,
    title: "Progress Analytics",
    desc: "Spot trends across strength, body weight, lean mass, and consistency.",
  },
  {
    icon: Users,
    title: "Gym Community",
    desc: "Share milestones and stay connected to members training beside you.",
    className: "lg:col-span-2",
    image: "/redesign/community-training.png",
  },
];

const steps = [
  {
    title: "Assess",
    desc: "Start with your current goal, training level, and InBody baseline.",
  },
  {
    title: "Plan",
    desc: "Alex AI and the coaching team shape your next week of work.",
  },
  {
    title: "Log",
    desc: "Capture training and nutrition while the details are still fresh.",
  },
  {
    title: "Adjust",
    desc: "Use weekly signals to raise load, tune macros, and recover smarter.",
  },
];

const heroLinks = [
  {
    href: "#member-loop",
    title: "Explore tools",
    desc: "Workout, InBody, nutrition",
    icon: Dumbbell,
  },
  {
    href: "#process",
    title: "See the process",
    desc: "Assess, plan, log, adjust",
    icon: LineChart,
  },
  {
    href: "#coach-support",
    title: "Coach support",
    desc: "AI plus trainer context",
    icon: ShieldCheck,
  },
];

const testimonials = [
  {
    quote:
      "The weekly view makes training feel measurable. I know what changed and what to do next.",
    name: "Hannah T.",
  },
  {
    quote: "Workout logs, InBody, and coach feedback finally sit in the same place.",
    name: "Marcus V.",
  },
];

type PublicPlan = {
  id: string;
  nameEn: string;
  nameVi: string;
  descriptionEn: string;
  descriptionVi: string;
  audience: string;
  priceVnd: number;
  durationDays: number;
  bonusDays: number;
  includesPtSessions: number;
};

type PublicPromotion = {
  id: string;
  titleEn: string;
  titleVi: string;
  bodyEn: string;
  bodyVi: string;
  bonusTermsEn: string;
  bonusTermsVi: string;
};

type PublicEvent = {
  id: string;
  titleEn: string;
  titleVi: string;
  descriptionEn: string;
  descriptionVi: string;
  eventType: string;
  imagePath?: string | null;
};

type PublicPt = {
  id: string;
  displayName: string;
  bioEn?: string | null;
  bioVi?: string | null;
  specialtiesEn?: string | null;
  specialtiesVi?: string | null;
  photoPath?: string | null;
  photoBase64?: string | null;
  yearsExperience?: number | null;
};

type PublicLandingContent = {
  branch: {
    addressEn: string;
    addressVi: string;
    phone: string;
    hoursEn: string;
    hoursVi: string;
    mapUrl: string;
    facebookUrl: string;
    heroImagePath?: string | null;
  } | null;
  plans: PublicPlan[];
  promotions: PublicPromotion[];
  events: PublicEvent[];
  pts: PublicPt[];
  photos: string[];
};

function Landing() {
  const [publicContent, setPublicContent] = useState<PublicLandingContent | null>(null);
  const [galleryApi, setGalleryApi] = useState<CarouselApi>();
  const [gallerySelected, setGallerySelected] = useState(0);
  const reduceMotion = useReducedMotion();
  const canObserve =
    typeof window !== "undefined" && typeof window.IntersectionObserver !== "undefined";
  const { scrollYProgress } = useScroll();
  const heroImageY = useTransform(scrollYProgress, [0, 0.28], ["0%", "8%"]);
  const heroTextY = useTransform(scrollYProgress, [0, 0.22], ["0%", "-4%"]);
  const coachImageScale = useTransform(scrollYProgress, [0.48, 0.82], [1.02, 1]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.add("public-funnel-snap");
    return () => root.classList.remove("public-funnel-snap");
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/landing")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setPublicContent(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!galleryApi) return;

    const updateGalleryProgress = () => {
      const visibleIndexes = galleryApi.slidesInView();
      const selectedIndex = Math.max(galleryApi.selectedScrollSnap(), ...visibleIndexes);
      setGallerySelected(Math.max(0, Math.min(selectedIndex, galleryApi.slideNodes().length - 1)));
    };
    updateGalleryProgress();
    galleryApi.on("reInit", updateGalleryProgress);
    galleryApi.on("select", updateGalleryProgress);
    galleryApi.on("scroll", updateGalleryProgress);
    galleryApi.on("settle", updateGalleryProgress);

    return () => {
      galleryApi.off("reInit", updateGalleryProgress);
      galleryApi.off("select", updateGalleryProgress);
      galleryApi.off("scroll", updateGalleryProgress);
      galleryApi.off("settle", updateGalleryProgress);
    };
  }, [galleryApi]);

  const text = (en?: string | null, vi?: string | null) => en || vi || "";
  const branch = publicContent?.branch;
  const plans = publicContent?.plans?.length ? publicContent.plans : [];
  const promotions = publicContent?.promotions?.length ? publicContent.promotions : [];
  const events = publicContent?.events?.length ? publicContent.events : [];
  const pts = publicContent?.pts?.length ? publicContent.pts : [];
  const galleryTotal = publicContent?.photos?.length ?? 0;
  const galleryProgress = galleryTotal > 0 ? ((gallerySelected + 1) / galleryTotal) * 100 : 0;
  const heroAddress = branch ? text(branch.addressEn, branch.addressVi) : "303 Le Thanh Nghi";
  const heroPhoto = "/photos/641295305_122181929684764018_5237898920015775179_n.jpg";
  const heroSignals = plans.slice(0, 4).map((plan) => ({
    title: text(plan.nameEn, plan.nameVi),
    detail: `${formatVnd(plan.priceVnd)} / ${plan.durationDays} days`,
  }));

  return (
    <div className="min-h-[100dvh] bg-[#080b0a] text-stone-50 dark">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080b0a]/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-[72px] lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="size-12 rounded-lg object-cover lg:size-14"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight text-stone-50">
                HL Fitness
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-stone-400">
                <MapPin className="size-3" strokeWidth={1.8} />
                <span className="truncate">{heroAddress}</span>
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="public-signin rounded-xl text-stone-200 hover:bg-white/[0.06] hover:text-stone-50"
            >
              <Link to="/auth" search={{ mode: "login", redirect: "/feed", email: "" }}>
                Sign in
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="kinetic-cta rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/get-started">Join now</Link>
            </Button>
          </div>
        </div>
      </header>

      <FixedSnapScroller>
        <MotionSection
          snap
          variant="hero"
          className="public-snap-section public-hero-section relative isolate flex min-h-[calc(100dvh-64px)] overflow-hidden border-b border-white/10 bg-[#050806] lg:min-h-0"
        >
          {heroPhoto && (
            <motion.div
              className="absolute inset-y-0 right-0 hidden h-full w-[68%] opacity-100 saturate-[1.08] lg:block lg:[clip-path:polygon(10%_0,100%_0,100%_100%,0_100%)]"
              style={reduceMotion ? undefined : { y: heroImageY }}
            >
              <OptimizedPicture
                src={heroPhoto}
                alt=""
                priority
                sizes="(min-width: 1024px) 68vw, 100vw"
              />
            </motion.div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#050806_0%,#050806_34%,rgba(5,8,6,0.52)_62%,rgba(5,8,6,0.86)_100%)]" />
          <div className="funnel-grid absolute inset-0 opacity-20" />
          <div className="funnel-noise absolute inset-0 opacity-70" />

          <div className="public-snap-section-inner relative mx-auto grid w-full max-w-7xl items-center gap-4 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:pb-[clamp(0.75rem,1.8vh,1.25rem)] lg:pt-[calc(72px+clamp(1.5rem,3vh,2.5rem))]">
            <motion.div className="max-w-4xl" style={reduceMotion ? undefined : { y: heroTextY }}>
              <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-stone-300 animate-fade-in lg:text-sm">
                <span className="h-px w-14 bg-primary" aria-hidden="true" />
                <span>HL Fitness</span>
                <span className="text-primary" aria-hidden="true">
                  /
                </span>
                <span>{heroAddress}</span>
              </div>
              <h1 className="max-w-4xl text-[clamp(2.75rem,11vw,4.75rem)] font-semibold leading-[0.94] tracking-tight text-stone-50 animate-fade-up lg:text-[clamp(3.5rem,6vw,5.6rem)]">
                Start training at HL Fitness.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-300 animate-fade-up stagger-1 md:text-lg">
                See current prices, promotions, PT options, and member tools before you visit 303 Le
                Thanh Nghi.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3 animate-fade-up stagger-2">
                <Button
                  asChild
                  size="lg"
                  className="kinetic-cta h-12 rounded-xl bg-primary px-7 text-base text-primary-foreground shadow-[0_18px_44px_rgba(244,179,43,0.22)] transition duration-200 hover:bg-primary/90 active:scale-[0.98]"
                >
                  <Link to="/get-started">
                    Join now <ArrowRight className="ml-2 size-4" strokeWidth={1.8} />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="public-signin h-12 rounded-xl border-white/15 bg-white/[0.04] px-7 text-base text-stone-50 hover:bg-white/[0.09]"
                >
                  <Link to="/auth" search={{ mode: "login", redirect: "/feed", email: "" }}>
                    Sign in
                  </Link>
                </Button>
              </div>

              {heroSignals.length > 0 && (
                <div className="hero-signal-strip mt-5 grid max-w-5xl gap-2.5 animate-fade-up stagger-3 sm:grid-cols-2 lg:grid-cols-4">
                  {heroSignals.map((item) => (
                    <div
                      key={item.title}
                      className="min-h-[84px] rounded-xl border border-white/10 bg-[#080b0a]/62 p-3 backdrop-blur"
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                        {item.title}
                      </div>
                      <div className="mt-2 text-xs leading-5 text-stone-300">{item.detail}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="hero-action-rail mt-3 flex max-w-5xl flex-wrap gap-2 animate-fade-up stagger-4">
                {heroLinks.map((item) => (
                  <HeroShortcut key={item.href} item={item} />
                ))}
              </div>

              {heroPhoto && (
                <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-[#111612] lg:hidden">
                  <OptimizedPicture
                    src={heroPhoto}
                    alt="HL Fitness training floor"
                    className="h-80 w-full object-cover"
                    priority
                  />
                </div>
              )}
            </motion.div>
          </div>
        </MotionSection>

        <MotionSection
          id="public-plans"
          snap
          variant="rise"
          className="public-snap-section public-plans-stage relative mx-auto flex min-h-[100dvh] max-w-7xl scroll-mt-24 flex-col justify-center overflow-hidden px-4 py-12 sm:px-6 md:py-16 lg:min-h-0 lg:px-8 lg:py-5"
        >
          <div className="relative grid gap-4 lg:grid-cols-[0.7fr_1fr] lg:items-end">
            <div className="max-w-2xl animate-slide-in-left">
              <div className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <span className="h-px w-12 bg-primary/70" aria-hidden="true" />
                <CreditCard className="size-3.5" strokeWidth={1.8} />
                <span>Current prices</span>
              </div>
              <h2 className="text-balance text-3xl font-semibold leading-[1.02] tracking-tight text-stone-50 md:text-4xl lg:max-w-xl lg:text-[clamp(2rem,2.75vw,2.75rem)]">
                Choose the right way to train.
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-stone-300 md:text-base">
                Monthly access, student pricing, and PT support are listed here so you can compare
                before you visit.
              </p>
            </div>
            <div className="grid gap-2.5 animate-slide-in-right sm:grid-cols-3">
              {[
                {
                  icon: Ticket,
                  label: "Public plans",
                  value: String(plans.length || 0),
                },
                {
                  icon: Gift,
                  label: "Bonus days",
                  value: `+${plans.reduce((sum, plan) => sum + plan.bonusDays, 0)}`,
                },
                {
                  icon: Dumbbell,
                  label: "PT sessions",
                  value: String(plans.reduce((sum, plan) => sum + plan.includesPtSessions, 0)),
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <KineticSurface
                    key={item.label}
                    variant="panel"
                    className="rounded-xl border border-white/10 bg-white/[0.035] p-3 lg:min-h-[96px]"
                  >
                    <Icon className="size-4.5 text-primary" strokeWidth={1.8} />
                    <div className="mt-2 text-xl font-semibold text-stone-50">{item.value}</div>
                    <div className="mt-1 text-xs leading-5 text-stone-400">{item.label}</div>
                  </KineticSurface>
                );
              })}
            </div>
          </div>

          <div className="relative mt-4 grid gap-3 lg:grid-cols-3">
            {plans.slice(0, 3).map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={reduceMotion || !canObserve ? false : { opacity: 0, y: 24, rotateX: -4 }}
                animate={canObserve ? undefined : { opacity: 1, y: 0, rotateX: 0 }}
                whileInView={canObserve ? { opacity: 1, y: 0, rotateX: 0 } : undefined}
                viewport={canObserve ? { once: true, amount: 0.35 } : undefined}
                transition={{
                  delay: reduceMotion ? 0 : index * 0.08,
                  duration: 0.58,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileHover={reduceMotion ? undefined : { y: -5, scale: 1.01 }}
              >
                <KineticSurface
                  variant="panel"
                  className={`plan-live-card flex h-full min-h-[220px] w-full flex-col justify-between rounded-xl border p-4 transition-colors lg:min-h-[280px] ${
                    index === 0
                      ? "border-primary/35 bg-primary/[0.095]"
                      : "border-white/10 bg-[#111612]"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                          <CreditCard className="size-3.5" strokeWidth={1.8} />
                          {plan.audience}
                        </div>
                        <h3 className="mt-3 text-xl font-semibold leading-tight text-stone-50 md:text-[1.35rem]">
                          {text(plan.nameEn, plan.nameVi)}
                        </h3>
                      </div>
                      {index === 0 ? (
                        <Flame className="size-6 text-primary" strokeWidth={1.8} />
                      ) : (
                        <Ticket className="size-6 text-primary" strokeWidth={1.8} />
                      )}
                    </div>
                    <div className="mt-4 text-[clamp(1.55rem,1.9vw,2rem)] font-semibold leading-none tracking-tight text-stone-50">
                      {formatVnd(plan.priceVnd)}
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-stone-300">
                      {text(plan.descriptionEn, plan.descriptionVi)}
                    </p>
                  </div>
                  <div className="mt-5 grid gap-2 text-xs text-stone-300">
                    {[
                      [`${plan.durationDays} days`, CalendarDays],
                      plan.bonusDays > 0 ? [`+${plan.bonusDays} bonus days`, Gift] : null,
                      plan.includesPtSessions > 0
                        ? [`${plan.includesPtSessions} PT sessions`, Users]
                        : null,
                    ]
                      .filter(Boolean)
                      .map((feature) => {
                        const [label, Icon] = feature as [string, typeof Timer];
                        return (
                          <div
                            key={label}
                            className="flex items-center gap-2 rounded-xl bg-white/[0.055] px-3 py-2"
                          >
                            <Icon className="size-4 text-primary" strokeWidth={1.8} />
                            <span>{label}</span>
                          </div>
                        );
                      })}
                  </div>
                </KineticSurface>
              </motion.div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <CheckCircle2 className="size-4 text-primary" strokeWidth={1.8} />
              Prices are updated by HL Fitness staff.
            </div>
            <Button
              asChild
              className="kinetic-cta rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link to="/get-started">
                Ask about a plan
                <ArrowRight className="ml-2 size-4" strokeWidth={1.8} />
              </Link>
            </Button>
          </div>
        </MotionSection>

        <MotionSection
          id="public-promos"
          snap
          variant="rise"
          className="public-snap-section public-promos-stage relative mx-auto flex min-h-[100dvh] max-w-7xl scroll-mt-24 flex-col justify-center overflow-hidden px-4 py-12 sm:px-6 md:py-16 lg:min-h-0 lg:px-8 lg:py-5"
        >
          <div className="relative grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div className="animate-slide-in-left">
              <div className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <span className="h-px w-12 bg-primary/70" aria-hidden="true" />
                <BadgePercent className="size-3.5" strokeWidth={1.8} />
                <span>Current offers</span>
              </div>
              <h2 className="text-balance text-3xl font-semibold leading-[1.02] tracking-tight text-stone-50 md:text-4xl lg:text-[clamp(2.25rem,3.7vw,3.25rem)]">
                Offers and events.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300 md:text-base">
                Check active promotions and upcoming gym events before you decide on a package.
              </p>
              <KineticSurface
                variant="cta"
                className="promo-spotlight mt-5 rounded-xl border border-primary/30 bg-primary p-4 text-primary-foreground"
              >
                <div className="flex items-center gap-3">
                  <Flame className="size-8 shrink-0" strokeWidth={1.8} />
                  <div>
                    <div className="text-sm font-semibold">Ask before you visit</div>
                    <div className="mt-1 text-sm opacity-80">
                      Staff can confirm the latest student, monthly, and PT options.
                    </div>
                  </div>
                </div>
              </KineticSurface>
            </div>

            <div className="grid gap-3 animate-slide-in-right lg:grid-cols-2 lg:items-stretch">
              <div className="grid gap-3 lg:grid-rows-[auto_1fr_1fr]">
                <div className="flex items-center gap-2 text-sm font-semibold text-stone-50">
                  <Gift className="size-5 text-primary" strokeWidth={1.8} />
                  Active promotions
                </div>
                {promotions.slice(0, 3).map((promo, index) => (
                  <motion.div
                    key={promo.id}
                    initial={reduceMotion || !canObserve ? false : { opacity: 0, x: -18 }}
                    animate={canObserve ? undefined : { opacity: 1, x: 0 }}
                    whileInView={canObserve ? { opacity: 1, x: 0 } : undefined}
                    viewport={canObserve ? { once: true, amount: 0.45 } : undefined}
                    transition={{ delay: reduceMotion ? 0 : index * 0.08, duration: 0.5 }}
                  >
                    <KineticSurface
                      variant="panel"
                      className="promo-live-card flex min-h-[148px] rounded-xl border border-white/10 bg-[#111612] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                          <BadgePercent className="size-5" strokeWidth={1.8} />
                        </div>
                        <div>
                          <div className="font-semibold leading-tight text-stone-50">
                            {text(promo.titleEn, promo.titleVi)}
                          </div>
                          <p className="mt-1 text-sm leading-5 text-stone-300">
                            {text(promo.bonusTermsEn, promo.bonusTermsVi) ||
                              text(promo.bodyEn, promo.bodyVi)}
                          </p>
                        </div>
                      </div>
                    </KineticSurface>
                  </motion.div>
                ))}
              </div>

              {events.length > 0 && (
                <div className="grid gap-3 lg:grid-rows-[auto_1fr_1fr]">
                  <div className="flex items-center gap-2 text-sm font-semibold text-stone-50">
                    <CalendarDays className="size-5 text-primary" strokeWidth={1.8} />
                    Upcoming events
                  </div>
                  {events.slice(0, 2).map((event, index) => (
                    <motion.div
                      key={event.id}
                      initial={reduceMotion || !canObserve ? false : { opacity: 0, x: 18 }}
                      animate={canObserve ? undefined : { opacity: 1, x: 0 }}
                      whileInView={canObserve ? { opacity: 1, x: 0 } : undefined}
                      viewport={canObserve ? { once: true, amount: 0.45 } : undefined}
                      transition={{ delay: reduceMotion ? 0 : index * 0.1, duration: 0.5 }}
                    >
                      <KineticSurface
                        variant="panel"
                        className="event-live-card min-h-[148px] rounded-xl border border-white/10 bg-white/[0.04] p-4"
                      >
                        <div className="text-xs uppercase tracking-[0.16em] text-primary">
                          {event.eventType}
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-stone-50">
                          {text(event.titleEn, event.titleVi)}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-stone-300">
                          {text(event.descriptionEn, event.descriptionVi)}
                        </p>
                      </KineticSurface>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </MotionSection>

        <MotionSection
          id="member-loop"
          snap
          variant="rise"
          className="public-snap-section mx-auto flex min-h-[100dvh] max-w-7xl scroll-mt-24 flex-col justify-center px-4 py-12 sm:px-6 md:py-16 lg:min-h-0 lg:px-8 lg:py-[clamp(0.75rem,2.4vh,2rem)]"
        >
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-50 md:text-4xl lg:text-[clamp(2.25rem,4vw,3.5rem)]">
              The member loop is finally connected.
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-300 md:text-base">
              Training, nutrition, body composition, and coach feedback stay in one rhythm.
            </p>
          </div>

          <div className="mt-5 grid auto-rows-[minmax(132px,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <KineticSurface
                  key={feature.title}
                  variant={feature.image ? "media" : "panel"}
                  className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[#111612] p-3.5 transition duration-300 hover:-translate-y-1 hover:border-primary/50 ${
                    feature.className ?? ""
                  }`}
                >
                  {feature.image && (
                    <OptimizedPicture
                      src={feature.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-35 transition duration-500 group-hover:opacity-45"
                      sizes="(min-width: 1024px) 50vw, 100vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,22,18,0.1),rgba(8,11,10,0.92))]" />
                  <div className="relative z-10 flex h-full flex-col justify-between gap-3">
                    <div className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-primary">
                      <Icon className="size-5" strokeWidth={1.8} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-stone-50 lg:text-lg">
                        {feature.title}
                      </h3>
                      <p className="mt-1.5 max-w-md text-sm leading-5 text-stone-300">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                </KineticSurface>
              );
            })}
          </div>
        </MotionSection>

        <MotionSection
          id="process"
          snap
          variant="panel"
          className="public-snap-section flex min-h-[100dvh] scroll-mt-24 items-center border-y border-white/10 bg-[#0d1110] lg:min-h-0"
        >
          <div className="public-snap-section-inner mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[0.72fr_1fr] lg:px-8 lg:py-[clamp(1.25rem,4vh,3rem)]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-stone-50 md:text-4xl lg:text-[clamp(2.25rem,4vw,3.5rem)]">
                Four steps that keep the work honest.
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-300 md:text-base">
                The app is built around repeated actions members already understand.
              </p>
            </div>
            <div className="grid gap-3">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-[3.25rem_1fr]"
                  initial={reduceMotion || !canObserve ? false : { opacity: 0, x: 18 }}
                  animate={canObserve ? undefined : { opacity: 1, x: 0 }}
                  whileInView={canObserve ? { opacity: 1, x: 0 } : undefined}
                  viewport={canObserve ? { once: true, amount: 0.5 } : undefined}
                  transition={{ delay: reduceMotion ? 0 : index * 0.08, duration: 0.46 }}
                >
                  <div className="text-xl font-semibold text-primary md:text-2xl">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-stone-50 md:text-xl">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-stone-300">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </MotionSection>

        <MotionSection
          id="coach-support"
          snap
          variant="image"
          className="public-snap-section mx-auto flex min-h-[100dvh] max-w-7xl scroll-mt-24 items-center px-4 py-10 sm:px-6 md:py-14 lg:min-h-0 lg:px-8 lg:py-0"
        >
          <KineticSurface
            variant="media"
            className="coach-media-panel relative w-full overflow-hidden rounded-2xl border border-white/10 bg-[#111612]"
          >
            <motion.div
              className="absolute inset-0 opacity-70 saturate-[1.06]"
              style={reduceMotion ? undefined : { scale: coachImageScale }}
            >
              <OptimizedPicture
                src="/redesign/coach-session.png"
                alt="Coach reviewing a training plan with a member"
                sizes="(min-width: 1024px) 1200px, 100vw"
              />
            </motion.div>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,11,10,0.18)_0%,rgba(8,11,10,0.62)_48%,rgba(8,11,10,0.96)_100%)]" />
            <div className="relative grid min-h-[420px] items-center p-5 sm:p-7 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,0.82fr)] lg:p-5">
              <div className="hidden lg:block" />
              <motion.div
                className="coach-panel-compact funnel-panel mx-auto w-full max-w-lg rounded-2xl bg-[#080b0a]/78 p-5 backdrop-blur md:p-6 lg:justify-self-center lg:p-4"
                initial={reduceMotion || !canObserve ? false : { opacity: 0, y: 18 }}
                animate={canObserve ? undefined : { opacity: 1, y: 0 }}
                whileInView={canObserve ? { opacity: 1, y: 0 } : undefined}
                viewport={canObserve ? { once: true, amount: 0.45 } : undefined}
                transition={{ duration: 0.58, ease: [0.16, 1, 0.3, 1] }}
              >
                <ShieldCheck className="mb-3 size-9 text-primary" strokeWidth={1.7} />
                <h2 className="text-3xl font-semibold tracking-tight text-stone-50 md:text-4xl lg:text-[clamp(2rem,3vw,3rem)]">
                  AI speed with coach accountability.
                </h2>
                <p className="mt-3 text-sm leading-6 text-stone-300 md:text-base">
                  Alex AI handles analysis and plan feedback. Trainers keep the work grounded in
                  your body, schedule, and technique.
                </p>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                  {[
                    [
                      "Technique notes",
                      "Real coaches can respond when form or recovery needs a human eye.",
                    ],
                    [
                      "Weekly analysis",
                      "Training history and nutrition logs become a readable plan update.",
                    ],
                  ].map(([title, desc]) => (
                    <div
                      key={title}
                      className="rounded-xl border border-white/10 bg-white/[0.04] p-3"
                    >
                      <h3 className="text-sm font-semibold text-stone-50">{title}</h3>
                      <p className="mt-1.5 text-xs leading-5 text-stone-300">{desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </KineticSurface>
        </MotionSection>

        <MotionSection
          id="team"
          snap
          variant="panel"
          className="public-snap-section mx-auto flex min-h-[100dvh] max-w-7xl scroll-mt-24 flex-col justify-center px-4 py-12 sm:px-6 md:py-16 lg:min-h-0 lg:px-8 lg:py-[clamp(0.75rem,2.4vh,2rem)]"
        >
          <div className="max-w-2xl mb-8">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-50 md:text-4xl lg:text-[clamp(2.25rem,4vw,3.5rem)]">
              PT team and staff.
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-300 md:text-base">
              Meet the coaches who support training, technique, and PT sessions.
            </p>
          </div>

          <Carousel className="w-full cursor-grab active:cursor-grabbing" opts={{ align: "start" }}>
            <CarouselContent className="-ml-4">
              {pts.map((pt) => (
                <CarouselItem key={pt.id} className="pl-4 md:basis-1/2 lg:basis-1/3 flex">
                  <div className="pt-slider-card rounded-2xl border border-white/10 bg-white/[0.02] p-8 flex-1 flex flex-col items-center text-center transition hover:bg-white/[0.04]">
                    <div className="relative">
                      <div className="absolute inset-[-12px] rounded-full border border-primary/20 bg-primary/5 animate-pulse" />
                      <Avatar className="size-24 mb-5 border-2 border-primary/40 relative z-10">
                        <AvatarImage
                          src={
                            pt.photoBase64 ||
                            pt.photoPath ||
                            `https://api.dicebear.com/7.x/notionists/svg?seed=${pt.displayName.replace(/ /g, "")}`
                          }
                          alt={pt.displayName}
                        />
                        <AvatarFallback className="bg-[#111612] text-primary">
                          {pt.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="font-semibold text-stone-50 text-xl">{pt.displayName}</div>
                    <div className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-primary">
                      {pt.yearsExperience ?? 0}+ YEARS EXP
                    </div>
                    <p className="mt-4 text-sm leading-6 text-stone-300">
                      {text(pt.bioEn, pt.bioVi) ||
                        text(pt.specialtiesEn, pt.specialtiesVi) ||
                        "Dedicated to pushing your boundaries."}
                    </p>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {pts.length > 3 && (
              <div className="absolute -bottom-16 left-0 right-0 flex justify-center gap-4 hidden md:flex">
                <CarouselPrevious className="static translate-y-0 transform-none bg-[#080b0a] border border-white/20 text-stone-300 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full flex items-center justify-center pointer-events-auto" />
                <CarouselNext className="static translate-y-0 transform-none bg-[#080b0a] border border-white/20 text-stone-300 hover:text-white hover:bg-white/10 h-10 w-10 rounded-full flex items-center justify-center pointer-events-auto" />
              </div>
            )}
          </Carousel>
        </MotionSection>

        {publicContent?.photos && publicContent.photos.length > 0 && (
          <MotionSection
            id="gallery"
            snap
            variant="panel"
            className="public-snap-section photo-gallery-stage mx-auto flex min-h-[100dvh] max-w-7xl scroll-mt-24 flex-col justify-center overflow-hidden px-4 py-12 sm:px-6 md:py-16 lg:min-h-0 lg:px-8 lg:py-5"
          >
            <div className="relative z-10 mb-4 grid gap-4 lg:grid-cols-[0.64fr_1fr] lg:items-end">
              <div className="max-w-2xl">
                <div className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  <span className="h-px w-12 bg-primary/70" aria-hidden="true" />
                  <Dumbbell className="size-3.5" strokeWidth={1.8} />
                  <span>Training floor</span>
                </div>
                <h2 className="text-balance text-3xl font-semibold leading-[1.02] tracking-tight text-stone-50 md:text-4xl lg:max-w-xl lg:text-[clamp(2.05rem,3.1vw,2.85rem)]">
                  See the gym before you visit.
                </h2>
                <p className="mt-3 text-sm leading-6 text-stone-300 md:text-base">
                  Real photos of the machines, free weights, and training areas at HL Fitness.
                </p>
              </div>
              <div className="hidden justify-end lg:flex">
                <div className="rounded-xl border border-white/10 bg-[#080b0a]/58 px-4 py-3 text-right backdrop-blur">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                    Photos
                  </div>
                  <div className="mt-1 text-sm text-stone-300">
                    {String(gallerySelected + 1).padStart(2, "0")} /{" "}
                    {String(publicContent.photos.length).padStart(2, "0")}
                  </div>
                </div>
              </div>
            </div>

            <Carousel
              className="photo-rail-carousel relative z-10 mx-auto w-full cursor-grab active:cursor-grabbing pb-12"
              opts={{ align: "start", loop: false, dragFree: true }}
              setApi={setGalleryApi}
            >
              <CarouselContent className="items-center -ml-3 md:-ml-5">
                {publicContent.photos.map((photo, i) => (
                  <CarouselItem
                    key={i}
                    className="photo-rail-item pl-3 basis-[82%] sm:basis-[62%] md:pl-5 lg:basis-[34%]"
                  >
                    <motion.div
                      className="photo-rail-card group relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#111612] shadow-2xl"
                      initial={
                        reduceMotion || !canObserve
                          ? false
                          : { opacity: 0, y: 18, rotate: i % 2 === 0 ? -1.5 : 1.5 }
                      }
                      animate={
                        canObserve
                          ? undefined
                          : { opacity: 1, y: 0, rotate: i % 2 === 0 ? -1.5 : 1.5 }
                      }
                      whileInView={
                        canObserve
                          ? { opacity: 1, y: 0, rotate: i % 2 === 0 ? -1.5 : 1.5 }
                          : undefined
                      }
                      whileHover={reduceMotion ? undefined : { y: -8, rotate: 0, scale: 1.015 }}
                      viewport={canObserve ? { once: true, amount: 0.25 } : undefined}
                      transition={{
                        delay: reduceMotion ? 0 : (i % 5) * 0.055,
                        duration: 0.52,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <div className="absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.04)_0%,rgba(0,0,0,0.38)_100%)] transition duration-500 group-hover:opacity-50" />
                      <img
                        src={
                          photo.startsWith("/") || photo.startsWith("data:")
                            ? photo
                            : `/photos/${photo}`
                        }
                        alt={`HL Fitness facility view ${i + 1}`}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.045]"
                      />
                      <div className="absolute bottom-3 left-3 z-20 rounded-xl border border-white/10 bg-[#080b0a]/70 px-3 py-2 text-xs font-semibold text-stone-200 backdrop-blur">
                        {String(i + 1).padStart(2, "0")} / {publicContent.photos.length}
                      </div>
                    </motion.div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="mx-auto mt-5 flex max-w-sm items-center gap-3 px-1">
                <span className="text-xs font-semibold tabular-nums text-stone-400">
                  {String(gallerySelected + 1).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  aria-label="Advance gallery"
                  onClick={() => galleryApi?.scrollNext()}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.12] text-left transition hover:bg-white/20"
                >
                  <span
                    className="block h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${galleryProgress}%` }}
                  />
                </button>
                <span className="text-xs font-semibold tabular-nums text-stone-400">
                  {String(publicContent.photos.length).padStart(2, "0")}
                </span>
              </div>
              {publicContent.photos.length > 2 && (
                <div className="absolute -bottom-1 left-0 right-0 hidden justify-center gap-4 md:flex">
                  <CarouselPrevious className="static flex h-10 w-10 translate-y-0 transform-none items-center justify-center rounded-full border border-white/20 bg-[#080b0a] text-stone-300 shadow-lg hover:bg-white/10 hover:text-white" />
                  <CarouselNext className="static flex h-10 w-10 translate-y-0 transform-none items-center justify-center rounded-full border border-white/20 bg-[#080b0a] text-stone-300 shadow-lg hover:bg-white/10 hover:text-white" />
                </div>
              )}
            </Carousel>
          </MotionSection>
        )}

        <MotionSection
          snap
          variant="panel"
          className="public-footer-band public-snap-section flex min-h-[86dvh] flex-col justify-between border-t border-white/10 bg-[#070a09] lg:min-h-0"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 md:py-10 lg:px-8 lg:py-[clamp(1rem,2.5vh,1.75rem)]">
            <KineticSurface
              variant="cta"
              className="w-full rounded-2xl border border-primary/25 bg-primary p-4 text-primary-foreground md:p-5"
            >
              <div className="grid gap-4 lg:grid-cols-[0.76fr_1fr_auto] lg:items-center">
                <div className="flex items-center gap-3">
                  <Timer className="size-8" strokeWidth={1.8} />
                  <div>
                    <div className="text-sm font-semibold">Ready for your first session?</div>
                    <div className="text-sm opacity-80">
                      Book the intro flow and bring your current goal.
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {testimonials.map((item) => (
                    <figure key={item.name} className="rounded-xl bg-black/10 p-3">
                      <blockquote className="text-sm leading-6">{item.quote}</blockquote>
                      <figcaption className="mt-2 text-xs opacity-75">{item.name}</figcaption>
                    </figure>
                  ))}
                </div>
                <Button
                  asChild
                  size="lg"
                  className="kinetic-cta rounded-xl bg-[#080b0a] text-stone-50 transition duration-200 hover:bg-[#151a17] active:scale-[0.98]"
                >
                  <Link to="/get-started">
                    Join now <ArrowRight className="ml-2 size-4" strokeWidth={1.8} />
                  </Link>
                </Button>
              </div>
            </KineticSurface>
          </div>

          <footer className="w-full border-t border-white/10 bg-[#0b0f0d] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
            <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-[1.15fr_0.78fr_0.95fr_0.95fr_0.78fr]">
              <div>
                <div className="flex items-center gap-3">
                  <img
                    src="/logo.jpg"
                    alt="HL Fitness logo"
                    className="size-10 rounded-lg object-cover"
                  />
                  <div>
                    <div className="text-sm font-semibold text-stone-50">HL Fitness</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-stone-400">
                      <MapPin className="size-3.5" strokeWidth={1.8} />
                      <span>303 Le Thanh Nghi</span>
                    </div>
                  </div>
                </div>
                <p className="mt-4 max-w-sm text-sm leading-6 text-stone-400">
                  A connected training loop for members, PTs, and managers at one focused gym.
                </p>
                <div className="mt-4 text-xs uppercase tracking-[0.16em] text-primary">
                  Details checked by staff
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-stone-50">Member tools</h3>
                <div className="mt-3 grid gap-2 text-sm text-stone-400">
                  <a href="#member-loop" className="transition hover:text-primary">
                    Workout and InBody
                  </a>
                  <a href="#process" className="transition hover:text-primary">
                    Training process
                  </a>
                  <a href="#coach-support" className="transition hover:text-primary">
                    Coach support
                  </a>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-stone-50">Visit HL Fitness</h3>
                <div className="mt-3 space-y-2 text-sm leading-6 text-stone-400">
                  <p>{heroAddress}</p>
                  <p>Book an intro meeting before your account is created.</p>
                  <p>{branch?.phone || "Phone pending verified source"}</p>
                  {branch?.mapUrl ? (
                    <a href={branch.mapUrl} className="block transition hover:text-primary">
                      Google Maps
                    </a>
                  ) : (
                    <p>Map link pending verified source</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-stone-50">Hours and social</h3>
                <div className="mt-3 space-y-2 text-sm leading-6 text-stone-400">
                  <p>{text(branch?.hoursEn, branch?.hoursVi) || "Hours pending verified source"}</p>
                  {branch?.facebookUrl ? (
                    <a href={branch.facebookUrl} className="block transition hover:text-primary">
                      Facebook
                    </a>
                  ) : (
                    <p>Facebook link pending verified source</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-stone-50">Account</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    asChild
                    size="sm"
                    className="kinetic-cta rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Link to="/get-started">Join now</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="public-signin rounded-xl border-white/15 bg-white/[0.04] text-stone-50"
                  >
                    <Link to="/auth" search={{ mode: "login", redirect: "/feed", email: "" }}>
                      Sign in
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-6 flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-stone-500">
              <div>Copyright 2026 HL Fitness. {heroAddress}.</div>
              <div>Privacy / Terms / Manager contact</div>
            </div>
          </footer>
        </MotionSection>
      </FixedSnapScroller>
    </div>
  );
}

function HeroShortcut({ item }: { item: (typeof heroLinks)[number] }) {
  const { goToSection } = useFixedSnapNavigation();
  const Icon = item.icon;
  const targetId = item.href.replace("#", "");

  return (
    <button
      type="button"
      data-section-target={targetId}
      aria-controls={targetId}
      onClick={() => goToSection(item.href)}
      className="group inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-[#080b0a]/62 px-3 py-2 text-left text-xs text-stone-300 backdrop-blur transition hover:border-primary/55 hover:bg-[#111612]/86 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Icon className="size-4 shrink-0 text-primary" strokeWidth={1.8} />
      <span className="font-semibold text-stone-50">{item.title}</span>
      <span className="hidden text-stone-500 xl:inline">/</span>
      <span className="hidden text-stone-400 xl:inline">{item.desc}</span>
      <ArrowRight
        className="size-4 shrink-0 text-stone-500 transition group-hover:translate-x-1 group-hover:text-primary"
        strokeWidth={1.8}
      />
    </button>
  );
}

function formatVnd(value: number) {
  return `${Math.round(value).toLocaleString("en-US")} VND`;
}
