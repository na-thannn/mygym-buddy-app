import { hasAnyRole, type Actor } from "./roles";

export type GroupClassAvailability = {
  capacity: number;
  bookedCount: number;
  seatsLeft: number;
};

export type GroupClassBookingState = {
  capacity: number;
  bookedCount: number;
  alreadyBooked: boolean;
  status?: string;
};

export function getGroupClassAvailability(
  capacity: number,
  bookedCount: number,
): GroupClassAvailability {
  return {
    capacity,
    bookedCount,
    seatsLeft: Math.max(0, capacity - bookedCount),
  };
}

export function canBookGroupClassSession(state: GroupClassBookingState): boolean {
  if (state.alreadyBooked) return false;
  if (state.status && state.status !== "scheduled") return false;
  return getGroupClassAvailability(state.capacity, state.bookedCount).seatsLeft > 0;
}

export function canManageGroupClasses(actor: Actor | null | undefined): boolean {
  return hasAnyRole(actor, ["admin", "staff", "pt"]);
}
