import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCleanDatabase } from "@/test/use-clean-database";

useCleanDatabase();

const authMock = vi.hoisted(() => ({
  readSessionCookie: vi.fn(),
  validateSessionToken: vi.fn(),
}));

const analysisMock = vi.hoisted(() => ({
  analyseFeedPostMeal: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => config,
}));

vi.mock("@/server/auth", () => authMock);

vi.mock("@/lib/feed-meal-analysis", () => analysisMock);

type RouteConfig = {
  server: { handlers: { POST: (ctx: unknown) => Promise<Response> } };
};

beforeEach(() => {
  vi.resetModules();
  authMock.readSessionCookie.mockReturnValue("session-token");
  authMock.validateSessionToken.mockResolvedValue({
    userId: "user-1",
    email: "member@example.com",
    displayName: "Member One",
    role: "customer",
  });
  analysisMock.analyseFeedPostMeal.mockResolvedValue({
    mealName: "Pho bo",
    macros: { calories: 500, proteinG: 30, carbsG: 60, fatsG: 10 },
    suggestedBucket: "lunch",
    aiConfigured: true,
  });
});

afterEach(() => {
  vi.resetModules();
});

async function seedPost(options: { postId: string; ownerId: string; content?: string }) {
  const { db, schema } = await import("@/server/db");
  await db.insert(schema.users).values({
    id: options.ownerId,
    email: `${options.ownerId}@example.com`,
    passwordHash: "hash",
    displayName: "Member One",
    role: "customer",
  });
  await db.insert(schema.communityFeed).values({
    id: options.postId,
    userId: options.ownerId,
    content: options.content ?? "",
  });
}

describe("feed analyse-meal API", () => {
  it("returns macros without writing nutrition reports", async () => {
    await seedPost({ postId: "post-1", ownerId: "user-1", content: "Pho bo" });
    const { Route } = (await import("./feed.analyse-meal")) as unknown as { Route: RouteConfig };

    const response = await Route.server.handlers.POST(
      new Request("http://local.test/api/feed/analyse-meal", {
        method: "POST",
        body: JSON.stringify({ postId: "post-1" }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.mealName).toBe("Pho bo");
    expect(payload.macros).toEqual({ calories: 500, proteinG: 30, carbsG: 60, fatsG: 10 });

    const { db, schema } = await import("@/server/db");
    const reports = await db.select().from(schema.nutritionReports);
    expect(reports).toHaveLength(0);
    const comments = await db.select().from(schema.feedComments);
    expect(comments).toHaveLength(0);
  });

  it("forbids analysing another member's post", async () => {
    await seedPost({ postId: "post-2", ownerId: "user-2", content: "Salad" });
    const { Route } = (await import("./feed.analyse-meal")) as unknown as { Route: RouteConfig };

    const response = await Route.server.handlers.POST(
      new Request("http://local.test/api/feed/analyse-meal", {
        method: "POST",
        body: JSON.stringify({ postId: "post-2" }),
      }),
    );

    expect(response.status).toBe(403);
  });
});
