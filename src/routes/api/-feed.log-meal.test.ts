import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({
  readSessionCookie: vi.fn(),
  validateSessionToken: vi.fn(),
  newId: vi.fn(),
}));

const nutritionMock = vi.hoisted(() => ({
  estimateMacrosForMeals: vi.fn(),
  estimateMealFromImage: vi.fn(),
}));

const timeMock = vi.hoisted(() => ({
  saigonParts: vi.fn(),
  bucketMealByHour: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => config,
}));

vi.mock("@/server/auth", () => authMock);

vi.mock("@/lib/nutrition.functions", () => nutritionMock);

vi.mock("@/lib/time", () => ({
  saigonParts: timeMock.saigonParts,
  bucketMealByHour: timeMock.bucketMealByHour,
}));

type RouteConfig = {
  server: { handlers: { POST: (ctx: unknown) => Promise<Response> } };
};

let idCounter = 0;

beforeEach(() => {
  vi.resetModules();
  idCounter = 0;
  process.env.GROQ_API_KEY = "test-key";
  authMock.readSessionCookie.mockReturnValue("session-token");
  authMock.validateSessionToken.mockResolvedValue({
    userId: "user-1",
    email: "member@example.com",
    displayName: "Member One",
    role: "customer",
  });
  authMock.newId.mockImplementation(() => `id-${(idCounter += 1)}`);
  nutritionMock.estimateMacrosForMeals.mockResolvedValue({
    calories: 500,
    protein_g: 30,
    carbs_g: 60,
    fats_g: 10,
  });
  nutritionMock.estimateMealFromImage.mockResolvedValue({
    name: "Grilled chicken bowl",
    calories: 600,
    protein_g: 45,
    carbs_g: 50,
    fats_g: 15,
  });
  timeMock.saigonParts.mockReturnValue({ date: "2026-06-17", hour: 12 });
  timeMock.bucketMealByHour.mockReturnValue("lunch");
});

afterEach(() => {
  delete process.env.GROQ_API_KEY;
  vi.resetModules();
});

async function seedPost(options: {
  postId: string;
  ownerId: string;
  content?: string;
  image?: string;
}) {
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
    imageBase64: options.image ?? null,
  });
}

describe("feed log-meal API", () => {
  it("logs a text meal into the Saigon time-of-day bucket and adds an agent comment", async () => {
    await seedPost({ postId: "post-1", ownerId: "user-1", content: "Pho bo" });
    const { Route } = (await import("./feed.log-meal")) as unknown as { Route: RouteConfig };

    const response = await Route.server.handlers.POST(
      new Request("http://local.test/api/feed/log-meal", {
        method: "POST",
        body: JSON.stringify({ postId: "post-1" }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.bucket).toBe("lunch");
    expect(payload.macros).toEqual({ calories: 500, proteinG: 30, carbsG: 60, fatsG: 10 });
    expect(payload.comment.isAgent).toBe(1);

    const { db, schema } = await import("@/server/db");
    const reports = await db.select().from(schema.nutritionReports);
    expect(reports).toHaveLength(1);
    expect(reports[0].reportDate).toBe("2026-06-17");
    expect(reports[0].lunch).toBe("Pho bo");
    expect(reports[0].calories).toBe(500);

    const comments = await db.select().from(schema.feedComments);
    expect(comments).toHaveLength(1);
    expect(comments[0].isAgent).toBe(1);
  });

  it("merges a second meal into the same day's report", async () => {
    await seedPost({ postId: "post-1", ownerId: "user-1", content: "Pho bo" });
    const { Route } = (await import("./feed.log-meal")) as unknown as { Route: RouteConfig };

    const makeRequest = () =>
      Route.server.handlers.POST(
        new Request("http://local.test/api/feed/log-meal", {
          method: "POST",
          body: JSON.stringify({ postId: "post-1" }),
        }),
      );

    await makeRequest();
    await makeRequest();

    const { db, schema } = await import("@/server/db");
    const reports = await db.select().from(schema.nutritionReports);
    expect(reports).toHaveLength(1);
    expect(reports[0].lunch).toBe("Pho bo; Pho bo");
    expect(reports[0].calories).toBe(1000);
  });

  it("uses the vision estimator when the post has an image", async () => {
    await seedPost({
      postId: "post-1",
      ownerId: "user-1",
      content: "",
      image: "data:image/png;base64,abc123",
    });
    const { Route } = (await import("./feed.log-meal")) as unknown as { Route: RouteConfig };

    const response = await Route.server.handlers.POST(
      new Request("http://local.test/api/feed/log-meal", {
        method: "POST",
        body: JSON.stringify({ postId: "post-1" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(nutritionMock.estimateMealFromImage).toHaveBeenCalled();
    const { db, schema } = await import("@/server/db");
    const reports = await db.select().from(schema.nutritionReports);
    expect(reports[0].lunch).toBe("Grilled chicken bowl");
    expect(reports[0].calories).toBe(600);
  });

  it("forbids logging another member's post", async () => {
    await seedPost({ postId: "post-2", ownerId: "user-2", content: "Salad" });
    const { Route } = (await import("./feed.log-meal")) as unknown as { Route: RouteConfig };

    const response = await Route.server.handlers.POST(
      new Request("http://local.test/api/feed/log-meal", {
        method: "POST",
        body: JSON.stringify({ postId: "post-2" }),
      }),
    );

    expect(response.status).toBe(403);
  });
});
