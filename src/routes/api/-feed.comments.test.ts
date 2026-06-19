import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({
  readSessionCookie: vi.fn(),
  validateSessionToken: vi.fn(),
  newId: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => config,
}));

vi.mock("@/server/auth", () => authMock);

type RouteConfig = {
  server: { handlers: { GET: () => Promise<Response>; POST: (ctx: unknown) => Promise<Response> } };
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
  authMock.newId.mockReturnValue("comment-1");
});

afterEach(() => {
  vi.resetModules();
});

async function seedPost() {
  const { db, schema } = await import("@/server/db");
  await db.insert(schema.users).values({
    id: "user-1",
    email: "member@example.com",
    passwordHash: "hash",
    displayName: "Member One",
    role: "customer",
  });
  await db.insert(schema.communityFeed).values({
    id: "post-1",
    userId: "user-1",
    content: "Chicken and rice",
  });
}

describe("feed comments API", () => {
  it("creates a comment on an existing post", async () => {
    await seedPost();
    const { Route } = (await import("./feed.comments")) as unknown as { Route: RouteConfig };
    const response = await Route.server.handlers.POST(
      new Request("http://local.test/api/feed/comments", {
        method: "POST",
        body: JSON.stringify({ postId: "post-1", content: "Looks great" }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.comment).toMatchObject({
      id: "comment-1",
      postId: "post-1",
      userId: "user-1",
      content: "Looks great",
      isAgent: 0,
      authorName: "Member One",
    });

    const { db, schema } = await import("@/server/db");
    const rows = await db.select().from(schema.feedComments);
    expect(rows).toHaveLength(1);
    expect(rows[0].content).toBe("Looks great");
  });

  it("returns saved comments with the author name on GET", async () => {
    await seedPost();
    const { Route } = (await import("./feed.comments")) as unknown as { Route: RouteConfig };
    await Route.server.handlers.POST(
      new Request("http://local.test/api/feed/comments", {
        method: "POST",
        body: JSON.stringify({ postId: "post-1", content: "Nice work" }),
      }),
    );

    const getResponse = await Route.server.handlers.GET();
    expect(getResponse.status).toBe(200);
    const rows = await getResponse.json();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ content: "Nice work", authorName: "Member One" });
  });

  it("rejects comments on a missing post", async () => {
    await seedPost();
    const { Route } = (await import("./feed.comments")) as unknown as { Route: RouteConfig };
    const response = await Route.server.handlers.POST(
      new Request("http://local.test/api/feed/comments", {
        method: "POST",
        body: JSON.stringify({ postId: "missing", content: "Hello" }),
      }),
    );

    expect(response.status).toBe(404);
  });

  it("requires a session", async () => {
    authMock.readSessionCookie.mockReturnValue(null);
    const { Route } = (await import("./feed.comments")) as unknown as { Route: RouteConfig };
    const response = await Route.server.handlers.POST(
      new Request("http://local.test/api/feed/comments", {
        method: "POST",
        body: JSON.stringify({ postId: "post-1", content: "Hello" }),
      }),
    );

    expect(response.status).toBe(401);
  });
});
