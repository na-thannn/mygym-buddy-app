import { describe, expect, it } from "vitest";
import {
  canBookGroupClassSession,
  canManageGroupClasses,
  getGroupClassAvailability,
} from "./group-classes";

describe("group class helpers", () => {
  it("calculates available seats from active bookings only", () => {
    expect(getGroupClassAvailability(10, 3)).toEqual({
      bookedCount: 3,
      capacity: 10,
      seatsLeft: 7,
    });
    expect(getGroupClassAvailability(4, 8)).toEqual({ bookedCount: 8, capacity: 4, seatsLeft: 0 });
  });

  it("blocks booking duplicate, full, or inactive class sessions", () => {
    expect(canBookGroupClassSession({ capacity: 6, bookedCount: 5, alreadyBooked: false })).toBe(
      true,
    );
    expect(canBookGroupClassSession({ capacity: 6, bookedCount: 6, alreadyBooked: false })).toBe(
      false,
    );
    expect(canBookGroupClassSession({ capacity: 6, bookedCount: 1, alreadyBooked: true })).toBe(
      false,
    );
    expect(
      canBookGroupClassSession({
        capacity: 6,
        bookedCount: 1,
        alreadyBooked: false,
        status: "cancelled",
      }),
    ).toBe(false);
  });

  it("limits class management to admins, managers, and PTs", () => {
    expect(canManageGroupClasses({ userId: "admin-1", role: "admin" })).toBe(true);
    expect(canManageGroupClasses({ userId: "manager-1", role: "manager" })).toBe(true);
    expect(canManageGroupClasses({ userId: "pt-1", role: "pt" })).toBe(true);
    expect(canManageGroupClasses({ userId: "customer-1", role: "customer" })).toBe(false);
  });
});
