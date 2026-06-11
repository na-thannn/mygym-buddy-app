import { describe, expect, test } from "vitest";
import { getSidebarNavClassName, getSidebarNavItemClassName } from "@/components/app-layout-nav";

describe("app layout nav classes", () => {
  test("desktop sidebar nav avoids useless internal scrolling", () => {
    const className = getSidebarNavClassName(false);

    expect(className).toContain("overflow-visible");
    expect(className).not.toContain("overflow-y-auto");
  });

  test("mobile sheet nav remains scrollable", () => {
    expect(getSidebarNavClassName(true)).toContain("overflow-y-auto");
  });

  test("desktop sidebar items are compact enough to fit customer nav", () => {
    const className = getSidebarNavItemClassName(false);

    expect(className).toContain("py-2");
    expect(className).toContain("text-[13px]");
  });
});
