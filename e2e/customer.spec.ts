import { test, expect } from "@playwright/test";
import {
  clickStable,
  expectHeading,
  expectToast,
  fieldInput,
  hasGroqKey,
  uniqueSuffix,
} from "./helpers";

test.describe("Customer workflows", () => {
  test("feed page loads and can create a community post", async ({ page }) => {
    await page.goto("/feed");
    await expectHeading(page, "Today");
    const suffix = uniqueSuffix();
    await page.getByPlaceholder("Share your workout, new PR, or progress...").fill(`E2E post ${suffix}`);
    await clickStable(page, page.getByRole("button", { name: "Post" }).first());
    await expectToast(page, "Posted");
    await expect(page.getByText(`E2E post ${suffix}`)).toBeVisible();
  });

  test("profile can be saved", async ({ page }) => {
    await page.goto("/profile");
    await expectHeading(page, "Coach profile");
    await page.getByPlaceholder("Fat loss, lean mass, performance").fill("Fat loss and strength");
    await clickStable(page, page.getByRole("button", { name: "Save profile" }));
    await expectToast(page, "Profile saved");
  });

  test("InBody page loads and result can be saved via API", async ({ page }) => {
    await page.goto("/inbody");
    await expectHeading(page, "InBody Reports");
    await expect(page.getByRole("button", { name: "Add result" })).toBeVisible();

    const response = await page.request.post("/api/inbody", {
      data: {
        reportDate: "2026-06-19",
        weightKg: 80.2,
        muscleMassKg: 35.4,
        bodyFatPercent: 17.8,
      },
    });
    expect(response.ok(), await response.text()).toBeTruthy();
    await page.reload();
    await expect(page.getByText("80.2kg").first()).toBeVisible();
  });

  test("workout entry can be logged via API and appears in log", async ({ page }) => {
    const suffix = uniqueSuffix();
    const exercise = `E2E Bench ${suffix}`;
    const response = await page.request.post("/api/log/workout", {
      data: {
        performedAt: "2026-06-19",
        dayLabel: "E2E Push",
        muscleGroup: "Chest",
        exercise,
        sets: 3,
        reps: "10",
        weightKg: 60,
      },
    });
    expect(response.ok(), await response.text()).toBeTruthy();

    await page.goto("/log/workout");
    await expectHeading(page, "Workout Log");
    await expect(page.getByRole("button", { name: exercise, exact: true })).toBeVisible();
  });

  test("nutrition log can be saved via API", async ({ page }) => {
    const response = await page.request.post("/api/log/nutrition-report", {
      data: {
        reportDate: "2026-06-19",
        dayType: "training",
        breakfast: "Oats and eggs",
        lunch: "Chicken rice bowl",
        dinner: "Salmon and vegetables",
        estimateMacros: false,
        calories: 2100,
        proteinG: 160,
        carbsG: 220,
        fatsG: 70,
      },
    });
    expect(response.ok(), await response.text()).toBeTruthy();

    await page.goto("/nutrition");
    await expectHeading(page, "Nutrition");
    await expect(page.getByText("Oats and eggs").first()).toBeVisible();
  });

  test("progress page loads with analytics sections", async ({ page }) => {
    await page.goto("/progress");
    await expectHeading(page, "Progress");
    await expect(page.getByText("Progress photos").first()).toBeVisible();
    await expect(page.getByText("Weekly AI analysis").first()).toBeVisible();
  });

  test("progress report page loads", async ({ page }) => {
    await page.goto("/progress-report");
    await expectHeading(page, "Weekly Report");
    await expect(
      page
        .getByRole("button", { name: "Generate review" })
        .or(page.getByText("No progress data yet"))
        .first(),
    ).toBeVisible();
  });

  test("training plan can be saved", async ({ page }) => {
    const suffix = uniqueSuffix();
    await page.goto("/plans");
    await expectHeading(page, "Training Plans");
    await fieldInput(page, "Title").fill(`E2E Plan ${suffix}`);
    await fieldInput(page, "Plan details (Markdown supported)").fill("## Day 1\n- Bench press 3x10");
    await page.getByRole("button", { name: "Save plan" }).click();
    await expectToast(page, "Plan saved");
  });

  test("packages page can send a request", async ({ page }) => {
    await page.goto("/packages");
    await expectHeading(page, "Packages");
    await expect(page.getByText("Active membership").first()).toBeVisible();
    const requestBtn = page.getByRole("button", { name: /Request package|Request service/ }).first();
    await clickStable(page, requestBtn);
    await expectToast(page, "Request sent to manager");
  });

  test("classes page loads discover section", async ({ page }) => {
    await page.goto("/classes");
    await expectHeading(page, "Group Classes");
    await expect(page.getByText(/Discover classes|Booked/i).first()).toBeVisible();
  });

  test("booking can be requested", async ({ page }) => {
    await page.goto("/bookings");
    await expectHeading(page, "Bookings");
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 2);
    const value = bookingDate.toISOString().slice(0, 16);
    await fieldInput(page, "Date and time").fill(value);
    await clickStable(page, page.getByRole("button", { name: "60" }));
    await fieldInput(page, "Session notes").fill("E2E technique check");
    await clickStable(page, page.getByRole("button", { name: "Request booking" }));
    await expectToast(page, "Booking requested");
  });

  test("change password page renders form", async ({ page }) => {
    await page.goto("/change-password");
    await expectHeading(page, "Change password");
    await expect(page.locator('[name="currentPassword"]')).toBeVisible();
    await expect(page.locator('[name="newPassword"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Save password" })).toBeVisible();
  });

  test("AI Coach chat can start a conversation", async ({ page }) => {
    test.skip(!hasGroqKey(), "GROQ_API_KEY not set");
    await page.goto("/trainer");
    await expectHeading(page, "Chat with AI Coach");
    await page.getByLabel("New chat").click();
    await page.getByPlaceholder(/Message Alex/).fill("What should I focus on this week?");
    await page.locator("form button[type='submit']").click();
    await expect(
      page.getByText(/AI Coach is thinking|Message Alex|focus on/i).first(),
    ).toBeVisible({ timeout: 90_000 });
  });

  test("analyses page loads", async ({ page }) => {
    await page.goto("/analyses");
    await expectHeading(page, "Coach Reviews");
    await expect(
      page
        .getByRole("button", { name: "New review" })
        .or(page.getByRole("link", { name: "Ask Alex" }))
        .first(),
    ).toBeVisible();
  });
});
