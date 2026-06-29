import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCleanDatabase } from "@/test/use-clean-database";

useCleanDatabase();

const authMock = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  newId: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: unknown) => config,
}));

vi.mock("@/server/auth", () => authMock);

beforeEach(() => {
  vi.resetModules();
  authMock.getSessionUser.mockReturnValue({
    userId: "pt-1",
    email: "pt@example.com",
    displayName: "Coach Linh",
    role: "pt",
    mustChangePassword: false,
  });
  authMock.newId.mockReturnValue("block-1");
});

afterEach(() => {
  vi.resetModules();
});

async function seedUsers() {
  const { db, schema } = await import("@/server/db");
  await db.insert(schema.users).values([
    {
      id: "pt-1",
      email: "pt@example.com",
      passwordHash: "hash",
      displayName: "Coach Linh",
      role: "pt",
    },
    {
      id: "customer-1",
      email: "member@example.com",
      passwordHash: "hash",
      displayName: "Member One",
      role: "customer",
      assignedPtId: "pt-1",
    },
  ]);
}

describe("PT unavailability blocks API", () => {
  it("lets a PT create their own block and returns overlapping booking conflicts", async () => {
    await seedUsers();
    const { db, schema } = await import("@/server/db");
    await db.insert(schema.bookings).values({
      id: "booking-1",
      customerId: "customer-1",
      ptId: "pt-1",
      status: "confirmed",
      scheduledAt: "2026-06-02T02:30:00.000Z",
      durationMinutes: 60,
    });

    const { handlePtUnavailabilityBlocksRequest } = await import("./pt-unavailability-blocks");
    const response = await handlePtUnavailabilityBlocksRequest(
      new Request("http://local.test/api/pt-unavailability-blocks", {
        method: "POST",
        body: JSON.stringify({
          unavailableDate: "2026-06-02",
          allDay: false,
          startTime: "09:00",
          endTime: "11:00",
          reason: "Study leave",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual({
      ok: true,
      id: "block-1",
      conflicts: [
        {
          type: "booking",
          id: "booking-1",
          title: "PT booking",
          startsAt: "2026-06-02T02:30:00.000Z",
        },
      ],
    });
  });

  it("rejects customer access", async () => {
    authMock.getSessionUser.mockReturnValue({
      userId: "customer-1",
      email: "member@example.com",
      displayName: "Member One",
      role: "customer",
      mustChangePassword: false,
    });

    const { handlePtUnavailabilityBlocksRequest } = await import("./pt-unavailability-blocks");
    const response = await handlePtUnavailabilityBlocksRequest(
      new Request("http://local.test/api/pt-unavailability-blocks", {
        method: "POST",
        body: JSON.stringify({ unavailableDate: "2026-06-02", allDay: true }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects partial blocks with invalid time ranges", async () => {
    await seedUsers();
    const { handlePtUnavailabilityBlocksRequest } = await import("./pt-unavailability-blocks");
    const response = await handlePtUnavailabilityBlocksRequest(
      new Request("http://local.test/api/pt-unavailability-blocks", {
        method: "POST",
        body: JSON.stringify({
          unavailableDate: "2026-06-02",
          allDay: false,
          startTime: "12:00",
          endTime: "12:00",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "End time must be after start time",
    });
  });
});
