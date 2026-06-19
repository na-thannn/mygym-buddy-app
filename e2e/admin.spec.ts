import { test, expect } from "@playwright/test";
import { expectHeading } from "./helpers";

test.describe("Admin workflows", () => {
  test("admin dashboard shows stats and user management", async ({ page }) => {
    await page.goto("/admin");
    await expectHeading(page, "Admin control panel");
    await expect(page.getByText("Total users").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Members without a PT").first()).toBeVisible();
    await expect(page.getByText("Open support tickets").first()).toBeVisible();
    await expect(page.getByText("Roles and assignments").first()).toBeVisible();
    await expect(page.getByPlaceholder("Search by name or email")).toBeVisible();
  });

  test("site content page loads editable sections", async ({ page }) => {
    await page.goto("/site");
    await expectHeading(page, "Site content");
    await expect(page.getByText("Branch details").first()).toBeVisible();
    await expect(page.getByText("Trainer cards").first()).toBeVisible();
    await expect(page.getByText("Gym photo album").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Save branch details" })).toBeVisible();
  });

  test("manager CRM is accessible from admin", async ({ page }) => {
    await page.goto("/staff");
    await expectHeading(page, "Manager CRM");
  });

  test("classes page loads for admin", async ({ page }) => {
    await page.goto("/classes");
    await expectHeading(page, "Group Classes");
  });

  test("bookings page loads for admin", async ({ page }) => {
    await page.goto("/bookings");
    await expectHeading(page, "Bookings");
  });

  test("feed page loads for admin", async ({ page }) => {
    await page.goto("/feed");
    await expectHeading(page, /Community Feed|Today/);
  });
});
