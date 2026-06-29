import { test, expect } from "@playwright/test";
import { clickStable, expectHeading, expectToast, pickAvailableGuestSlot, uniqueSuffix, DEMO_PASSWORD } from "./helpers";

test.describe("Public pages", () => {
  test("landing page renders hero, sections, and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/HL Fitness/);
    await expectHeading(page, "Start training at HL Fitness.");
    await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Join now" }).first()).toBeVisible();
    await expect(page.locator("#public-plans")).toBeVisible();
    await expect(page.locator("#member-loop")).toBeVisible();
    await expect(page.locator("#coach-support")).toBeVisible();
  });

  test("get-started page loads onboarding step 1", async ({ page }) => {
    await page.goto("/get-started");
    await expectHeading(page, "What is your primary goal?");
    await expect(page.getByRole("button", { name: /Build Muscle/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Lose Weight/i })).toBeVisible();
  });

  test("guest meeting can be submitted via API", async ({ request }) => {
    const suffix = uniqueSuffix();
    const optionsRes = await request.get("/api/guest-meeting-options");
    expect(optionsRes.ok()).toBeTruthy();
    const options = await optionsRes.json();
    const booking = pickAvailableGuestSlot(options);

    const meetingRes = await request.post("/api/guest-meetings", {
      data: {
        name: `E2E Guest ${suffix}`,
        email: `guest-api-${suffix}@example.com`,
        phone: "+84900000000",
        goal: "Build Muscle",
        experience: "Beginner",
        daysPerWeek: "3 days",
        requestedPtId: booking.ptId,
        scheduledAt: booking.scheduledAt,
        meetingType: "in_person",
      },
    });
    expect(meetingRes.ok(), await meetingRes.text()).toBeTruthy();
  });

  test("auth sign-in succeeds for demo member", async ({ page, request }) => {
    const res = await request.post("/api/signin", {
      data: { email: "member@hlfitness.test", password: DEMO_PASSWORD },
    });
    expect(res.ok()).toBeTruthy();
    const cookie = res.headers()["set-cookie"]?.match(/alex_session=([^;]+)/)?.[1];
    expect(cookie).toBeTruthy();
    await page.context().addCookies([
      {
        name: "alex_session",
        value: cookie!,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    await page.goto("/feed");
    await expectHeading(page, "Today");
  });

  test("auth sign-in shows error for invalid credentials", async ({ request }) => {
    const response = await request.post("/api/signin", {
      data: { email: "not-a-user@hlfitness.test", password: "wrong-password" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(String(body.error)).toMatch(/Email or password is incorrect|Sign in failed/i);
  });
});
