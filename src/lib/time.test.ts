import { describe, expect, it } from "vitest";
import { bucketMealByHour, saigonDateString, saigonParts } from "@/lib/time";

describe("bucketMealByHour", () => {
  it("maps morning hours to breakfast", () => {
    expect(bucketMealByHour(5)).toBe("breakfast");
    expect(bucketMealByHour(8)).toBe("breakfast");
    expect(bucketMealByHour(10)).toBe("breakfast");
  });

  it("maps midday hours to lunch", () => {
    expect(bucketMealByHour(11)).toBe("lunch");
    expect(bucketMealByHour(14)).toBe("lunch");
  });

  it("maps evening hours to dinner", () => {
    expect(bucketMealByHour(17)).toBe("dinner");
    expect(bucketMealByHour(21)).toBe("dinner");
  });

  it("falls back to snacks for mid-afternoon and late night", () => {
    expect(bucketMealByHour(15)).toBe("snacks");
    expect(bucketMealByHour(16)).toBe("snacks");
    expect(bucketMealByHour(22)).toBe("snacks");
    expect(bucketMealByHour(2)).toBe("snacks");
  });
});

describe("saigonParts", () => {
  it("returns the local Saigon date and hour for a UTC instant", () => {
    // 2026-06-17T02:30:00Z is 09:30 in Asia/Saigon (UTC+7).
    const parts = saigonParts(new Date("2026-06-17T02:30:00.000Z"));
    expect(parts.date).toBe("2026-06-17");
    expect(parts.hour).toBe(9);
  });

  it("rolls into the next local day past 17:00 UTC", () => {
    // 2026-06-17T18:00:00Z is 01:00 on 2026-06-18 in Asia/Saigon.
    const parts = saigonParts(new Date("2026-06-17T18:00:00.000Z"));
    expect(parts.date).toBe("2026-06-18");
    expect(parts.hour).toBe(1);
  });

  it("saigonDateString returns just the date string", () => {
    expect(saigonDateString(new Date("2026-06-17T02:30:00.000Z"))).toBe("2026-06-17");
  });
});
