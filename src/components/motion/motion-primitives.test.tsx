import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  FixedSnapScroller,
  KineticSurface,
  MagneticTarget,
  MotionSection,
  OptimizedPicture,
} from "./public-funnel-motion";

const originalMatchMedia = window.matchMedia;
const originalScrollTo = window.scrollTo;
const originalReplaceState = window.history.replaceState;

describe("public funnel motion primitives", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(min-width: 1024px)",
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.scrollTo = vi.fn();
    window.history.replaceState = vi.fn();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.scrollTo = originalScrollTo;
    window.history.replaceState = originalReplaceState;
    vi.restoreAllMocks();
  });

  test("MotionSection renders children and only applies snap alignment when requested", () => {
    const { rerender } = render(
      <MotionSection snap={false}>
        <p>Regular section</p>
      </MotionSection>,
    );

    expect(screen.getByText("Regular section")).toBeInTheDocument();
    expect(screen.getByText("Regular section").parentElement).not.toHaveClass("snap-start");

    rerender(
      <MotionSection snap>
        <p>Snap section</p>
      </MotionSection>,
    );

    expect(screen.getByText("Snap section").parentElement).toHaveClass("snap-start");
    expect(screen.getByText("Snap section").parentElement).toHaveAttribute(
      "data-snap-section",
      "true",
    );
    expect(screen.getByText("Snap section").parentElement).toHaveAttribute(
      "data-motion-root-stable",
      "true",
    );
  });

  test("FixedSnapScroller renders a contained scroll stage", () => {
    render(
      <FixedSnapScroller className="custom-stage">
        <MotionSection snap>
          <p>Contained panel</p>
        </MotionSection>
      </FixedSnapScroller>,
    );

    const stage = screen.getByText("Contained panel").closest("[data-fixed-snap-stage]");
    expect(stage).toBeInTheDocument();
    expect(stage).toHaveClass("public-snap-stage", "custom-stage");

    const track = stage?.querySelector("[data-fixed-snap-track='true']");
    expect(track).toBeInTheDocument();
    expect(track).toHaveClass("public-snap-track");
  });

  test("FixedSnapScroller handles same-page anchors through the fixed panel controller", async () => {
    const user = userEvent.setup();
    render(
      <FixedSnapScroller>
        <MotionSection snap>
          <a href="#process">See the process</a>
        </MotionSection>
        <MotionSection id="member-loop" snap>
          <p>Member loop</p>
        </MotionSection>
        <MotionSection id="process" snap>
          <p>Process panel</p>
        </MotionSection>
      </FixedSnapScroller>,
    );

    const stage = screen.getByText("See the process").closest("[data-fixed-snap-stage]");
    Object.defineProperty(stage, "scrollTop", { value: 120, writable: true });

    await waitFor(() => expect(stage).toHaveAttribute("data-fixed-snap-controller", "true"));
    await user.click(screen.getByRole("link", { name: "See the process" }));

    await waitFor(() => {
      expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
      expect(stage).toHaveProperty("scrollTop", 0);
    });
    expect(window.history.replaceState).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("");
  });

  test("KineticSurface renders a pointer-ready panel without old spotlight classes", () => {
    render(
      <KineticSurface variant="panel">
        <button type="button">Kinetic action</button>
      </KineticSurface>,
    );

    const surface = screen.getByRole("button", { name: "Kinetic action" }).parentElement;

    expect(surface).toHaveClass("kinetic-surface", "kinetic-surface-panel");
    expect(surface).not.toHaveClass("spotlight-surface");
  });

  test("KineticSurface supports media surfaces for image-led panels", () => {
    render(
      <KineticSurface variant="media">
        <button type="button">Media surface</button>
      </KineticSurface>,
    );

    expect(screen.getByRole("button", { name: "Media surface" }).parentElement).toHaveClass(
      "kinetic-surface-media",
    );
  });

  test("MagneticTarget remains a stable compatibility wrapper", () => {
    render(
      <MagneticTarget>
        <button type="button">Stable action</button>
      </MagneticTarget>,
    );

    const wrapper = screen.getByRole("button", { name: "Stable action" }).parentElement;

    expect(wrapper).toHaveClass("inline-flex");
    expect(wrapper).not.toHaveClass("magnetic-target");
  });

  test("OptimizedPicture keeps hero images eager and below-fold images lazy", () => {
    const { rerender } = render(
      <OptimizedPicture
        src="/redesign/hero-training-floor.png"
        alt="Hero training floor"
        priority
      />,
    );

    expect(screen.getByRole("img", { name: "Hero training floor" })).toHaveAttribute(
      "loading",
      "eager",
    );
    expect(screen.getByRole("img", { name: "Hero training floor" })).toHaveAttribute(
      "decoding",
      "async",
    );

    rerender(
      <OptimizedPicture src="/redesign/coach-session.png" alt="Coach reviewing training plan" />,
    );

    expect(screen.getByRole("img", { name: "Coach reviewing training plan" })).toHaveAttribute(
      "loading",
      "lazy",
    );
  });
});
