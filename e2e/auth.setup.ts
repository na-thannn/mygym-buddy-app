import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DEMO_PASSWORD, USERS, type DemoRole } from "./helpers";

const authDir = "e2e/.auth";

async function authenticateRole(role: DemoRole, path: string, page: import("@playwright/test").Page, request: import("@playwright/test").APIRequestContext) {
  const { email } = USERS[role];
  const res = await request.post("/api/signin", {
    data: { email, password: DEMO_PASSWORD },
  });
  expect(res.ok(), `signin failed for ${email}: ${await res.text()}`).toBeTruthy();

  const setCookie = res.headers()["set-cookie"] ?? "";
  const match = setCookie.match(/alex_session=([^;]+)/);
  expect(match, `missing session cookie for ${email}`).toBeTruthy();

  await page.context().addCookies([
    {
      name: "alex_session",
      value: match![1],
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/feed");
  await page.waitForURL(/\/feed/, { timeout: 30_000 });
  await page.context().storageState({ path });
}

for (const role of Object.keys(USERS) as DemoRole[]) {
  const path = `${authDir}/${role}.json`;

  setup(`authenticate as ${role}`, async ({ page, request }) => {
    mkdirSync(dirname(path), { recursive: true });
    await authenticateRole(role, path, page, request);
  });
}
