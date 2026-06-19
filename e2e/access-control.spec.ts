import { test, expect } from "@playwright/test";

test.describe("Access control", () => {
  test("unauthenticated user is redirected to auth", async ({ page }) => {
    await page.goto("/feed");
    await page.waitForURL(/\/auth/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("customer cannot access admin pages", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "e2e/.auth/customer.json" });
    const page = await context.newPage();
    await page.goto("/admin");
    await expect(page.getByText("Admin access required")).toBeVisible();
    await context.close();
  });

  test("customer cannot access manager CRM", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "e2e/.auth/customer.json" });
    const page = await context.newPage();
    await page.goto("/staff");
    await expect(page.getByText("Manager access required")).toBeVisible();
    await context.close();
  });

  test("customer cannot access PT desk", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "e2e/.auth/customer.json" });
    const page = await context.newPage();
    await page.goto("/pt-inbox");
    await expect(page.getByText("PT access required")).toBeVisible();
    await context.close();
  });

  test("PT cannot access packages page", async ({ browser }) => {
    const context = await browser.newContext({ storageState: "e2e/.auth/pt.json" });
    const page = await context.newPage();
    await page.goto("/packages");
    await expect(page.getByText("Customer access required")).toBeVisible();
    await context.close();
  });
});
