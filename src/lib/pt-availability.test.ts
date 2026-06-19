import { describe, expect, it } from "vitest";
import {
  getSaigonDateTimeParts,
  isIntervalBlockedByPtUnavailability,
  validatePtUnavailabilityBlock,
  type PtUnavailabilityBlock,
} from "./pt-availability";

const blocks: PtUnavailabilityBlock[] = [
  {
    id: "full-day",
    ptId: "pt-1",
    unavailableDate: "2026-06-02",
    allDay: true,
    startTime: null,
    endTime: null,
    reason: null,
  },
  {
    id: "morning-block",
    ptId: "pt-2",
    unavailableDate: "2026-06-02",
    allDay: false,
    startTime: "09:00",
    endTime: "12:00",
    reason: "Study leave",
  },
];

describe("PT availability helpers", () => {
  it("converts ISO timestamps into Asia/Saigon date and minutes", () => {
    expect(getSaigonDateTimeParts("2026-06-02T02:30:00.000Z")).toEqual({
      date: "2026-06-02",
      minutes: 570,
    });
  });

  it("blocks any interval on a full unavailable day", () => {
    expect(
      isIntervalBlockedByPtUnavailability({
        ptId: "pt-1",
        startsAt: "2026-06-02T11:00:00.000Z",
        durationMinutes: 60,
        blocks,
      }),
    ).toBe(true);

    expect(
      isIntervalBlockedByPtUnavailability({
        ptId: "pt-1",
        startsAt: "2026-06-03T02:00:00.000Z",
        durationMinutes: 60,
        blocks,
      }),
    ).toBe(false);
  });

  it("blocks overlapping time ranges and allows edge-adjacent ranges", () => {
    expect(
      isIntervalBlockedByPtUnavailability({
        ptId: "pt-2",
        startsAt: "2026-06-02T02:00:00.000Z",
        durationMinutes: 60,
        blocks,
      }),
    ).toBe(true);

    expect(
      isIntervalBlockedByPtUnavailability({
        ptId: "pt-2",
        startsAt: "2026-06-02T05:00:00.000Z",
        durationMinutes: 60,
        blocks,
      }),
    ).toBe(false);
  });

  it("validates partial unavailable blocks with HH:mm start before end", () => {
    expect(validatePtUnavailabilityBlock({ allDay: true })).toEqual({ ok: true });
    expect(validatePtUnavailabilityBlock({ allDay: false, startTime: "09:00", endTime: "10:30" })).toEqual({
      ok: true,
    });
    expect(validatePtUnavailabilityBlock({ allDay: false, startTime: "12:00", endTime: "12:00" })).toEqual({
      ok: false,
      error: "End time must be after start time",
    });
    expect(validatePtUnavailabilityBlock({ allDay: false, startTime: "9am", endTime: "10:00" })).toEqual({
      ok: false,
      error: "Start and end time must use HH:mm format",
    });
  });
});
