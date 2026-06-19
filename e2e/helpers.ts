import type { Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const DEMO_PASSWORD = "password123";

export const USERS = {
  admin: { email: "admin@hlfitness.test", role: "admin" },
  manager: { email: "manager@hlfitness.test", role: "manager" },
  pt: { email: "linh.pt@hlfitness.test", role: "pt" },
  customer: { email: "member@hlfitness.test", role: "customer" },
} as const;

export type DemoRole = keyof typeof USERS;

export function hasGroqKey() {
  return Boolean(process.env.GROQ_API_KEY);
}

export function fieldInput(root: Page | Locator, label: string): Locator {
  return root
    .locator(".space-y-1, .space-y-1\\.5, .space-y-2")
    .filter({ has: root.locator("label", { hasText: label, exact: true }) })
    .locator("input, textarea")
    .first();
}

export async function signInViaUi(
  page: Page,
  email: string,
  password = DEMO_PASSWORD,
) {
  await page.goto("/auth");
  await page.locator("#li-email").fill(email);
  await page.locator("#li-pw").fill(password);
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/signin") && res.request().method() === "POST",
      { timeout: 45_000 },
    ),
    page.locator("form button[type='submit']").click(),
  ]);
  expect(response.ok()).toBeTruthy();
  await page.waitForURL(/\/(feed|trainer|change-password)/, { timeout: 30_000 });
}

export async function clickStable(_page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.click();
}

export async function expectHeading(page: Page, name: string | RegExp) {
  await page.getByRole("heading", { name }).first().waitFor({ timeout: 20_000 });
}

export async function expectToast(page: Page, text: string | RegExp) {
  await page.getByText(text).first().waitFor({ timeout: 20_000 });
}

export function pickAvailableGuestSlot(options: {
  slots: Array<{ scheduledAt: string }>;
  availability: Array<{ ptId: string; unavailableSlots: string[] }>;
}) {
  for (const slot of options.slots) {
    const match = options.availability.find(
      (row) => !row.unavailableSlots.includes(slot.scheduledAt),
    );
    if (match) {
      return { scheduledAt: slot.scheduledAt, ptId: match.ptId };
    }
  }
  throw new Error("No available guest meeting slot");
}

export function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
}
