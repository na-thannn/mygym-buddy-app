import { describe, expect, it } from "vitest";
import {
  canProvisionGuestLogin,
  generateFixedMeetingSlots,
  generateTemporaryPassword,
  selectPtForGuestMeeting,
} from "./guest-meetings";

const scheduledAt = "2026-06-02T02:00:00.000Z";

const pts = [
  { id: "pt-b", displayName: "Bao Coach" },
  { id: "pt-a", displayName: "An Coach" },
  { id: "pt-c", displayName: "Cuong Coach" },
];

describe("guest meeting helpers", () => {
  it("generates fixed Asia/Saigon meeting slots for the next seven days", () => {
    const slots = generateFixedMeetingSlots(new Date("2026-06-01T00:00:00.000Z"));

    expect(slots).toHaveLength(21);
    expect(slots.slice(0, 3)).toEqual([
      "2026-06-01T02:00:00.000Z",
      "2026-06-01T07:00:00.000Z",
      "2026-06-01T11:00:00.000Z",
    ]);
  });

  it("assigns the requested PT when that coach is available", () => {
    const result = selectPtForGuestMeeting({
      requestedPtId: "pt-b",
      scheduledAt,
      pts,
      existingBookings: [],
      existingGuestMeetings: [],
      unavailableDays: [],
    });

    expect(result).toEqual({ assignedPtId: "pt-b", usedFallback: false });
  });

  it("auto assigns the first available PT by display name when requested PT is unavailable", () => {
    const result = selectPtForGuestMeeting({
      requestedPtId: "pt-b",
      scheduledAt,
      pts,
      existingBookings: [],
      existingGuestMeetings: [],
      unavailableDays: [{ ptId: "pt-b", unavailableDate: "2026-06-02" }],
    });

    expect(result).toEqual({ assignedPtId: "pt-a", usedFallback: true });
  });

  it("returns null when every PT is unavailable for the requested slot", () => {
    const result = selectPtForGuestMeeting({
      requestedPtId: "pt-b",
      scheduledAt,
      pts,
      existingBookings: [{ ptId: "pt-a", scheduledAt }],
      existingGuestMeetings: [
        { assignedPtId: "pt-b", scheduledAt, status: "confirmed" },
        { assignedPtId: "pt-c", scheduledAt, status: "completed" },
      ],
      unavailableDays: [],
    });

    expect(result).toBeNull();
  });

  it("generates temporary passwords without ambiguous characters", () => {
    const password = generateTemporaryPassword(() => 0);

    expect(password).toHaveLength(12);
    expect(password).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789]+$/);
  });

  it("allows guest login provisioning only for new emails or the linked created user", () => {
    expect(canProvisionGuestLogin({ existingUserId: null, meetingCreatedUserId: null })).toBe(true);
    expect(
      canProvisionGuestLogin({ existingUserId: "user-1", meetingCreatedUserId: "user-1" }),
    ).toBe(true);
    expect(canProvisionGuestLogin({ existingUserId: "user-1", meetingCreatedUserId: null })).toBe(
      false,
    );
    expect(
      canProvisionGuestLogin({ existingUserId: "user-1", meetingCreatedUserId: "user-2" }),
    ).toBe(false);
  });
});
