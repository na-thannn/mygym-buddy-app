import { test, expect } from "@playwright/test";
import { expectHeading } from "./helpers";

test.describe("Manager workflows", () => {
  test("Manager CRM loads tabs and today view", async ({ page }) => {
    await page.goto("/staff");
    await expectHeading(page, "Manager CRM");
    await expect(page.getByRole("tab", { name: "Today" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Sales ops" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Guest meetings" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Support" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Bookings" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Catalog" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Customers" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "PT calendar" })).toBeVisible();
  });

  test("support tab opens queue", async ({ page }) => {
    await page.goto("/staff");
    await page.getByRole("tab", { name: "Support" }).click();
    await expect(page.getByText(/Support|Needs attention|Resolve/i).first()).toBeVisible();
  });

  test("customers tab opens search", async ({ page }) => {
    await page.goto("/staff");
    await page.getByRole("tab", { name: "Customers" }).click();
    await expect(page.getByPlaceholder("Search customer by name or email")).toBeVisible();
  });

  test("sales ops tab opens package requests", async ({ page }) => {
    await page.goto("/staff");
    await page.getByRole("tab", { name: "Sales ops" }).click();
    await expect(page.getByText(/Sales ops|package request|manual membership/i).first()).toBeVisible();
  });

  test("classes page loads for manager", async ({ page }) => {
    await page.goto("/classes");
    await expectHeading(page, "Group Classes");
  });

  test("bookings page loads for manager", async ({ page }) => {
    await page.goto("/bookings");
    await expectHeading(page, "Bookings");
  });
});
