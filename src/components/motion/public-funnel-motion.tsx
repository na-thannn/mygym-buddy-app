import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HTMLMotionProps } from "framer-motion";
import { motion, useMotionValue, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/utils";
import { FixedSnapNavigationContext } from "./public-funnel-navigation";

type MotionSectionVariant = "hero" | "rise" | "panel" | "image";
type KineticSurfaceVariant = "panel" | "media" | "cta";

const SNAP_TRANSITION_LOCK_MS = 1080;
const WHEEL_DELTA_THRESHOLD = 72;

const sectionVariants: Record<
  MotionSectionVariant,
  {
    hidden: { opacity: number; y?: number; scale?: number };
    visible: { opacity: number; y?: number; scale?: number };
  }
> = {
  hero: {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0 },
  },
  rise: {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 },
  },
  panel: {
    hidden: { opacity: 0, y: 20, scale: 0.985 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
  image: {
    hidden: { opacity: 0, scale: 1.025 },
    visible: { opacity: 1, scale: 1 },
  },
};

export function MotionSection({
  children,
  className,
  snap = false,
  variant = "rise",
  ...props
}: {
  children: ReactNode;
  className?: string;
  snap?: boolean;
  variant?: MotionSectionVariant;
} & Omit<HTMLMotionProps<"section">, "children">) {
  const reduceMotion = useReducedMotion();
  const canObserve =
    typeof window !== "undefined" && typeof window.IntersectionObserver !== "undefined";
  const canAnimateRoot = !snap && !reduceMotion && canObserve;

  return (
    <motion.section
      className={cn(snap && "snap-start scroll-mt-0", className)}
      data-snap-section={snap ? "true" : undefined}
      data-motion-root-stable={snap ? "true" : undefined}
      initial={canAnimateRoot ? "hidden" : false}
      animate={canAnimateRoot ? undefined : "visible"}
      whileInView={canAnimateRoot ? "visible" : undefined}
      viewport={
        canAnimateRoot ? { once: true, amount: variant === "hero" ? 0.28 : 0.2 } : undefined
      }
      variants={sectionVariants[variant]}
      transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.section>
  );
}

export function FixedSnapScroller({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<"main">, "children">) {
  const reduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLElement | null>(null);
  const activeIndexRef = useRef(0);
  const lockedRef = useRef(false);
  const releaseTimerRef = useRef<number | null>(null);
  const wheelDeltaRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fixedEnabled, setFixedEnabled] = useState(false);
  const [stageHeight, setStageHeight] = useState(0);
  const fixedActive = fixedEnabled && !reduceMotion;

  const getSections = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return [];
    return Array.from(stage.querySelectorAll<HTMLElement>("[data-snap-section='true']"));
  }, []);

  const resetNativeScroll = useCallback(() => {
    const stage = stageRef.current;
    if (stage) stage.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const cleanLandingHash = useCallback(() => {
    if (typeof window === "undefined" || !window.location.hash) return;

    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  const releaseLock = useCallback(() => {
    if (releaseTimerRef.current !== null) window.clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = window.setTimeout(() => {
      lockedRef.current = false;
      wheelDeltaRef.current = 0;
    }, SNAP_TRANSITION_LOCK_MS);
  }, []);

  const moveToIndex = useCallback(
    (nextIndex: number) => {
      const stage = stageRef.current;
      const sections = getSections();
      if (!stage || sections.length === 0) return;

      const measuredHeight = stage.getBoundingClientRect().height;
      if (measuredHeight > 0) setStageHeight(measuredHeight);

      const clamped = Math.max(0, Math.min(nextIndex, sections.length - 1));
      activeIndexRef.current = clamped;
      wheelDeltaRef.current = 0;
      lockedRef.current = true;
      resetNativeScroll();
      setActiveIndex(clamped);
      releaseLock();
    },
    [getSections, releaseLock, resetNativeScroll],
  );

  const goToSection = useCallback(
    (targetId: string) => {
      if (typeof window === "undefined") return;

      const id = decodeURIComponent(targetId.replace(/^#/, ""));
      if (!id) return;

      const sections = getSections();
      const sectionIndex = sections.findIndex((section) => section.id === id);
      const shouldUseFixedController =
        fixedActive ||
        (!reduceMotion &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(min-width: 1024px)").matches);

      cleanLandingHash();

      if (shouldUseFixedController && sectionIndex >= 0) {
        moveToIndex(sectionIndex);
        return;
      }

      document.getElementById(id)?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    },
    [cleanLandingHash, fixedActive, getSections, moveToIndex, reduceMotion],
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setFixedEnabled(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || reduceMotion || !fixedEnabled) {
      activeIndexRef.current = 0;
      setActiveIndex(0);
      setStageHeight(0);
      return;
    }

    const updateStageHeight = () => {
      setStageHeight(stage.getBoundingClientRect().height);
    };

    updateStageHeight();
    window.addEventListener("resize", updateStageHeight);

    const resizeObserver =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateStageHeight);
    resizeObserver?.observe(stage);

    return () => {
      window.removeEventListener("resize", updateStageHeight);
      resizeObserver?.disconnect();
    };
  }, [fixedEnabled, reduceMotion]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || reduceMotion || !fixedEnabled) return;

    const syncHashToIndex = () => {
      const sections = getSections();
      if (sections.length === 0) return 0;
      const id = window.location.hash.replace("#", "");
      if (!id) return 0;
      return Math.max(
        0,
        sections.findIndex((section) => section.id === decodeURIComponent(id)),
      );
    };

    const initialIndex = syncHashToIndex();
    activeIndexRef.current = initialIndex;
    setActiveIndex(initialIndex);
    resetNativeScroll();
    cleanLandingHash();

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 1 || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      event.preventDefault();
      if (lockedRef.current) return;

      const direction = Math.sign(event.deltaY);
      if (direction !== Math.sign(wheelDeltaRef.current)) {
        wheelDeltaRef.current = 0;
      }

      wheelDeltaRef.current += event.deltaY;
      if (Math.abs(wheelDeltaRef.current) < WHEEL_DELTA_THRESHOLD) return;

      moveToIndex(activeIndexRef.current + (wheelDeltaRef.current > 0 ? 1 : -1));
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a") || target?.isContentEditable) {
        return;
      }

      const current = activeIndexRef.current;
      const keyMap: Record<string, number> = {
        ArrowDown: current + 1,
        PageDown: current + 1,
        " ": event.shiftKey ? current - 1 : current + 1,
        ArrowUp: current - 1,
        PageUp: current - 1,
        Home: 0,
        End: getSections().length - 1,
      };

      if (!(event.key in keyMap)) return;
      event.preventDefault();
      if (lockedRef.current) return;
      moveToIndex(keyMap[event.key]);
    };

    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href^='#']");
      const href = anchor?.getAttribute("href");
      if (!href || href === "#") return;

      const id = decodeURIComponent(href.slice(1));
      const sectionIndex = getSections().findIndex((section) => section.id === id);
      if (sectionIndex < 0) return;

      event.preventDefault();
      goToSection(id);
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });
    stage.addEventListener("click", handleAnchorClick, { capture: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      stage.removeEventListener("wheel", handleWheel);
      stage.removeEventListener("click", handleAnchorClick, { capture: true });
      window.removeEventListener("keydown", handleKeyDown);
      if (releaseTimerRef.current !== null) window.clearTimeout(releaseTimerRef.current);
      lockedRef.current = false;
      wheelDeltaRef.current = 0;
    };
  }, [
    cleanLandingHash,
    fixedEnabled,
    getSections,
    goToSection,
    moveToIndex,
    reduceMotion,
    resetNativeScroll,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const id = window.location.hash.replace("#", "");
    if (!id) return;

    const fixedViewport =
      !reduceMotion &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(min-width: 1024px)").matches;

    if (fixedViewport) return;

    document.getElementById(decodeURIComponent(id))?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
    cleanLandingHash();
  }, [cleanLandingHash, reduceMotion]);

  const trackStyle =
    fixedActive && stageHeight > 0
      ? ({ transform: `translate3d(0, -${activeIndex * stageHeight}px, 0)` } as CSSProperties)
      : undefined;
  const navigation = useMemo(
    () => ({ activeIndex, fixedActive, goToSection }),
    [activeIndex, fixedActive, goToSection],
  );

  return (
    <FixedSnapNavigationContext.Provider value={navigation}>
      <main
        ref={stageRef}
        className={cn("public-snap-stage", className)}
        data-fixed-snap-stage="true"
        data-fixed-snap-controller={fixedActive ? "true" : undefined}
        {...props}
      >
        <div className="public-snap-track" data-fixed-snap-track="true" style={trackStyle}>
          {children}
        </div>
      </main>
    </FixedSnapNavigationContext.Provider>
  );
}

export function KineticSurface({
  children,
  className,
  variant = "panel",
}: {
  children: ReactNode;
  className?: string;
  variant?: KineticSurfaceVariant;
}) {
  const reduceMotion = useReducedMotion();
  const [canTrackPointer, setCanTrackPointer] = useState(false);
  const x = useMotionValue("50%");
  const y = useMotionValue("50%");

  useEffect(() => {
    if (reduceMotion || typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setCanTrackPointer(false);
      return;
    }

    const query = window.matchMedia("(pointer: fine)");
    setCanTrackPointer(query.matches);

    const update = (event: MediaQueryListEvent) => setCanTrackPointer(event.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, [reduceMotion]);

  return (
    <motion.div
      className={cn(
        "kinetic-surface relative isolate overflow-hidden",
        `kinetic-surface-${variant}`,
        className,
      )}
      onPointerMove={
        canTrackPointer
          ? (event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              x.set(`${event.clientX - rect.left}px`);
              y.set(`${event.clientY - rect.top}px`);
            }
          : undefined
      }
      onPointerLeave={
        canTrackPointer
          ? () => {
              x.set("50%");
              y.set("50%");
            }
          : undefined
      }
      style={{ "--kinetic-x": x, "--kinetic-y": y } as CSSProperties}
    >
      {children}
    </motion.div>
  );
}

export function SpotlightSurface({
  children,
  className,
  intensity = "subtle",
}: {
  children: ReactNode;
  className?: string;
  intensity?: "subtle" | "strong";
}) {
  return (
    <KineticSurface variant={intensity === "strong" ? "media" : "panel"} className={className}>
      {children}
    </KineticSurface>
  );
}

export function MagneticTarget({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  return <div className={cn("inline-flex", className)}>{children}</div>;
}

export function OptimizedPicture({
  src,
  alt,
  className,
  priority = false,
  sizes = "100vw",
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn("block h-full w-full object-cover", className)}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      sizes={sizes}
    />
  );
}
