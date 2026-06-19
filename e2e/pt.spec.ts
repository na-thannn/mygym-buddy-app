import { test, expect } from "@playwright/test";
import { expectHeading } from "./helpers";

test.describe("PT workflows", () => {
  test("PT Desk loads operational sections", async ({ page }) => {
    await page.goto("/pt-inbox");
    await expectHeading(page, "PT Desk");
    await expect(page.getByText("Assigned clients").first()).toBeVisible();
    await expect(page.getByText("Guest meeting requests").first()).toBeVisible();
    await expect(page.getByText("Session requests").first()).toBeVisible();
    await expect(page.getByText("Escalated support").first()).toBeVisible();
  });

  test("classes page loads for PT", async ({ page }) => {
    await page.goto("/classes");
    await expectHeading(page, "Group Classes");
  });

  test("bookings page loads for PT", async ({ page }) => {
    await page.goto("/bookings");
    await expectHeading(page, "Bookings");
  });

  test("feed page loads for PT", async ({ page }) => {
    await page.goto("/feed");
    await expectHeading(page, /Community Feed|Today/);
  });

  test("profile page loads for PT", async ({ page }) => {
    await page.goto("/profile");
    await expectHeading(page, "Coach profile");
  });
});
