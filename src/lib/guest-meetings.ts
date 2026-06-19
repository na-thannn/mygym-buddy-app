import { isIntervalBlockedByPtUnavailability, type PtUnavailabilityBlock } from "./pt-availability";

const SAIGON_OFFSET_MS = 7 * 60 * 60 * 1000;
const SLOT_HOURS = [9, 14, 18] as const;
const ACTIVE_GUEST_STATUSES = new Set([
  "confirmed",
  "completed",
  "account_invited",
  "email_failed",
]);
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export type MeetingPt = {
  id: string;
  displayName: string;
};

export type ExistingBookingSlot = {
  ptId?: string | null;
  scheduledAt: string;
};

export type ExistingGuestMeetingSlot = {
  assignedPtId?: string | null;
  scheduledAt: string;
  status?: string | null;
};

export type PtSelectionInput = {
  requestedPtId: string;
  scheduledAt: string;
  pts: MeetingPt[];
  existingBookings: ExistingBookingSlot[];
  existingGuestMeetings: ExistingGuestMeetingSlot[];
  unavailabilityBlocks: PtUnavailabilityBlock[];
};

export type PtSelectionResult = {
  assignedPtId: string;
  usedFallback: boolean;
};

export function generateFixedMeetingSlots(now = new Date()): string[] {
  const localNow = new Date(now.getTime() + SAIGON_OFFSET_MS);
  const year = localNow.getUTCFullYear();
  const month = localNow.getUTCMonth();
  const day = localNow.getUTCDate();
  const slots: string[] = [];

  for (let dateOffset = 0; dateOffset < 7; dateOffset += 1) {
    for (const hour of SLOT_HOURS) {
      const slot = new Date(Date.UTC(year, month, day + dateOffset, hour - 7, 0, 0, 0));
      if (slot.getTime() > now.getTime()) {
        slots.push(slot.toISOString());
      }
    }
  }

  return slots;
}

export function selectPtForGuestMeeting(input: PtSelectionInput): PtSelectionResult | null {
  const sortedPts = [...input.pts].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "en", { sensitivity: "base" }),
  );
  const requested = sortedPts.find((pt) => pt.id === input.requestedPtId);

  if (requested && isPtAvailable(requested.id, input)) {
    return { assignedPtId: requested.id, usedFallback: false };
  }

  const fallback = sortedPts.find(
    (pt) => pt.id !== input.requestedPtId && isPtAvailable(pt.id, input),
  );
  return fallback ? { assignedPtId: fallback.id, usedFallback: true } : null;
}

export function generateTemporaryPassword(random = Math.random): string {
  let password = "";
  for (let i = 0; i < 12; i += 1) {
    const index = Math.min(
      Math.floor(random() * PASSWORD_ALPHABET.length),
      PASSWORD_ALPHABET.length - 1,
    );
    password += PASSWORD_ALPHABET[index];
  }
  return password;
}

export function canProvisionGuestLogin({
  existingUserId,
  meetingCreatedUserId,
}: {
  existingUserId: string | null | undefined;
  meetingCreatedUserId: string | null | undefined;
}): boolean {
  return !existingUserId || existingUserId === meetingCreatedUserId;
}

export function getSaigonDate(isoDateTime: string): string {
  const date = new Date(Date.parse(isoDateTime) + SAIGON_OFFSET_MS);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isPtAvailable(ptId: string, input: PtSelectionInput): boolean {
  if (
    isIntervalBlockedByPtUnavailability({
      ptId,
      startsAt: input.scheduledAt,
      durationMinutes: 60,
      blocks: input.unavailabilityBlocks,
    })
  ) {
    return false;
  }

  const hasBookingConflict = input.existingBookings.some(
    (booking) => booking.ptId === ptId && booking.scheduledAt === input.scheduledAt,
  );
  if (hasBookingConflict) return false;

  return !input.existingGuestMeetings.some(
    (meeting) =>
      meeting.assignedPtId === ptId &&
      meeting.scheduledAt === input.scheduledAt &&
      ACTIVE_GUEST_STATUSES.has(meeting.status ?? "confirmed"),
  );
}
