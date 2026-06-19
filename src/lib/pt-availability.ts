const SAIGON_OFFSET_MS = 7 * 60 * 60 * 1000;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export type PtUnavailabilityBlock = {
  id?: string;
  ptId: string;
  unavailableDate: string;
  allDay: boolean | number;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
};

export type AvailabilityInterval = {
  ptId: string;
  startsAt: string;
  durationMinutes: number;
};

export type PtUnavailabilityBlockInput = {
  allDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

export type PtUnavailabilityValidation =
  | { ok: true }
  | { ok: false; error: string };

export function getSaigonDateTimeParts(isoDateTime: string) {
  const date = new Date(Date.parse(isoDateTime) + SAIGON_OFFSET_MS);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  return {
    date: `${year}-${month}-${day}`,
    minutes: hours * 60 + minutes,
  };
}

export function isIntervalBlockedByPtUnavailability({
  ptId,
  startsAt,
  durationMinutes,
  blocks,
}: AvailabilityInterval & { blocks: PtUnavailabilityBlock[] }): boolean {
  return Boolean(
    findBlockingPtUnavailabilityBlock({
      ptId,
      startsAt,
      durationMinutes,
      blocks,
    }),
  );
}

export function findBlockingPtUnavailabilityBlock({
  ptId,
  startsAt,
  durationMinutes,
  blocks,
}: AvailabilityInterval & { blocks: PtUnavailabilityBlock[] }): PtUnavailabilityBlock | null {
  const start = getSaigonDateTimeParts(startsAt);
  const endTotalMinutes = start.minutes + Math.max(1, durationMinutes);
  const dateIntervals = [{ date: start.date, startMinutes: start.minutes, endMinutes: endTotalMinutes }];

  if (endTotalMinutes > 24 * 60) {
    dateIntervals[0].endMinutes = 24 * 60;
    dateIntervals.push({
      date: addYmdDays(start.date, 1),
      startMinutes: 0,
      endMinutes: endTotalMinutes - 24 * 60,
    });
  }

  return (
    blocks.find((block) => {
      if (block.ptId !== ptId) return false;
      return dateIntervals.some((interval) => doesBlockOverlapInterval(block, interval));
    }) ?? null
  );
}

export function doesBlockOverlapInterval(
  block: PtUnavailabilityBlock,
  interval: { date: string; startMinutes: number; endMinutes: number },
): boolean {
  if (block.unavailableDate !== interval.date) return false;
  if (Boolean(block.allDay)) return true;
  const blockStart = timeToMinutes(block.startTime);
  const blockEnd = timeToMinutes(block.endTime);
  if (blockStart == null || blockEnd == null) return false;
  return interval.startMinutes < blockEnd && interval.endMinutes > blockStart;
}

export function validatePtUnavailabilityBlock(
  input: PtUnavailabilityBlockInput,
): PtUnavailabilityValidation {
  if (input.allDay) return { ok: true };
  if (!isValidTime(input.startTime) || !isValidTime(input.endTime)) {
    return { ok: false, error: "Start and end time must use HH:mm format" };
  }
  const start = timeToMinutes(input.startTime);
  const end = timeToMinutes(input.endTime);
  if (start == null || end == null) {
    return { ok: false, error: "Start and end time must use HH:mm format" };
  }
  if (end <= start) return { ok: false, error: "End time must be after start time" };
  return { ok: true };
}

export function timeToMinutes(value: string | null | undefined): number | null {
  if (!isValidTime(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function isValidTime(value: string | null | undefined): value is string {
  if (!value || !TIME_PATTERN.test(value)) return false;
  const [hours, minutes] = value.split(":").map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function addYmdDays(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}
