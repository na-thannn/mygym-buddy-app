import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const AUDITED_PATHS = ["src/routes", "src/components", "src/styles.css"];
const DASH_PATTERN = new RegExp("[\\u2014\\u2013]|\\u00e2\\u20ac[\\u201c\\u201d]");
const REMOTE_STOCK_HOST = ["images", "unsplash", "com"].join(".");

function collectFiles(path: string): string[] {
  const absolute = join(ROOT, path);
  const relativePath = relative(ROOT, absolute).replaceAll("\\", "/");

  if (relativePath.startsWith("src/routes/api")) return [];

  const stats = statSync(absolute);

  if (stats.isFile()) return [absolute];

  return readdirSync(absolute).flatMap((entry) => {
    const next = join(absolute, entry);
    const nextStats = statSync(next);

    if (nextStats.isDirectory()) return collectFiles(relative(ROOT, next));
    if (/\.(ts|tsx|css)$/.test(entry) && !/\.(test|spec)\./.test(entry)) return [next];
    return [];
  });
}

describe("frontend redesign audit", () => {
  test("source visible UI strings do not contain em dash or en dash separators", () => {
    const offenders = AUDITED_PATHS.flatMap(collectFiles)
      .map((file) => ({
        file: relative(ROOT, file),
        content: readFileSync(file, "utf8"),
      }))
      .filter(({ content }) => DASH_PATTERN.test(content))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  test("public funnel uses project assets instead of remote Unsplash URLs", () => {
    const publicRoutes = ["src/routes/index.tsx", "src/routes/get-started.tsx"];
    const offenders = publicRoutes.filter((file) =>
      readFileSync(join(ROOT, file), "utf8").includes(REMOTE_STOCK_HOST),
    );

    expect(offenders).toEqual([]);
  });

  test("public funnel fixed snap scroll is contained and has a reduced-motion escape hatch", () => {
    const styles = readFileSync(join(ROOT, "src/styles.css"), "utf8");

    expect(styles).toContain("html.public-funnel-snap");
    expect(styles).toContain(".public-snap-stage");
    expect(styles).toContain(".public-snap-track");
    expect(styles).toContain("overflow: hidden");
    expect(styles).toContain("touch-action: none");
    expect(styles).toContain("transform");
    expect(styles).toContain("transition: transform 980ms");
    expect(styles).toContain("height: calc(100dvh - 72px)");
    expect(styles).not.toContain("--public-bottom-reserve");
    expect(styles).not.toContain("margin-bottom: var(--public-bottom-reserve)");
    expect(styles).not.toContain("scroll-snap-type: y mandatory");
    expect(styles).toContain("html.public-funnel-snap,");
    expect(styles).toContain("scroll-snap-type: none");
  });

  test("landing fixed snap navigation does not leave section hashes in the URL", () => {
    const motion = readFileSync(
      join(ROOT, "src/components/motion/public-funnel-motion.tsx"),
      "utf8",
    );

    expect(motion).toContain("cleanLandingHash");
    expect(motion).toContain('replaceState(null, "", window.location.pathname');
    expect(motion).not.toContain('replaceState(null, "", `#${id}`)');
  });

  test("landing snap sections use compact viewport-safe layout hooks", () => {
    const landing = readFileSync(join(ROOT, "src/routes/index.tsx"), "utf8");

    expect(landing).toContain("hero-signal-strip");
    expect(landing).toContain("hero-action-rail");
    expect(landing).toContain("coach-panel-compact");
    expect(landing).toContain("useFixedSnapNavigation");
    expect(landing).toContain("data-section-target");
    expect(landing).not.toContain("href={item.href}");
  });

  test("public funnel uses kinetic hover surfaces instead of yellow spotlight and magnetic CTAs", () => {
    const styles = readFileSync(join(ROOT, "src/styles.css"), "utf8");
    const landing = readFileSync(join(ROOT, "src/routes/index.tsx"), "utf8");
    const getStarted = readFileSync(join(ROOT, "src/routes/get-started.tsx"), "utf8");

    expect(styles).toContain(".kinetic-surface::before");
    expect(styles).toContain(".kinetic-cta::before");
    expect(styles).not.toContain(".spotlight-surface::before");
    expect(styles).not.toContain(".magnetic-target");

    expect(landing).toContain("KineticSurface");
    expect(landing).toContain("kinetic-cta");
    expect(landing).not.toContain("SpotlightSurface");
    expect(landing).not.toContain("MagneticTarget");

    expect(getStarted).toContain("KineticSurface");
    expect(getStarted).toContain("kinetic-cta");
    expect(getStarted).not.toContain("SpotlightSurface");
    expect(getStarted).not.toContain("MagneticTarget");
  });

  test("public funnel hover polish keeps CTA wipes straight and sign-in readable", () => {
    const styles = readFileSync(join(ROOT, "src/styles.css"), "utf8");
    const landing = readFileSync(join(ROOT, "src/routes/index.tsx"), "utf8");

    expect(styles).toContain(".public-signin:hover");
    expect(styles).toContain(".coach-media-panel");
    expect(styles).toContain("circle 40px at var(--kinetic-x) var(--kinetic-y)");
    expect(styles).toContain("transform-origin: left center");
    expect(styles).not.toContain("skewX");
    expect(styles).not.toContain("rotate(3deg)");
    expect(styles).not.toContain("conic-gradient");

    expect(landing).toContain("public-signin");
    expect(landing).toContain("coach-media-panel");
    expect(landing).toContain("lg:justify-self-center");
  });

  test("landing page includes a designed public footer", () => {
    const landing = readFileSync(join(ROOT, "src/routes/index.tsx"), "utf8");

    expect(landing).toContain("public-footer-band");
    expect(landing).toContain("Member tools");
    expect(landing).toContain("Visit HL Fitness");
    expect(landing).toContain("Copyright 2026 HL Fitness");
    expect(landing).toContain("Hours pending verified source");
    expect(landing).not.toContain("absolute bottom-0 left-0 right-0 h-px");
  });

  test("get-started meeting slots render as a calendar picker", () => {
    const getStarted = readFileSync(join(ROOT, "src/routes/get-started.tsx"), "utf8");

    expect(getStarted).toContain("meeting-calendar");
    expect(getStarted).toContain("calendar-day-column");
    expect(getStarted).toContain("calendar-time-chip");
  });
});
