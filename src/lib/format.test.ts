import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { formatDate, formatDateTime, relativeTime } from "./format";

describe("format utilities", () => {
  it("formatDate returns en-US date", () => {
    const d = new Date("2020-01-02T00:00:00Z");
    expect(formatDate(d)).toBe(d.toLocaleDateString("en-US"));
  });

  it("formatDateTime returns en-US date/time", () => {
    const d = new Date("2020-01-02T15:04:00Z");
    expect(formatDateTime(d)).toBe(
      d.toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      }),
    );
  });

  it("relativeTime returns just now for current time and minutes/hours for past times", () => {
    // freeze time for deterministic results
    const now = new Date("2024-01-01T00:00:00Z");
    vi.setSystemTime(now);
    try {
      expect(relativeTime(new Date("2024-01-01T00:00:00Z"))).toBe("just now");
      expect(relativeTime(new Date("2023-12-31T23:58:00Z"))).toBe("2 minutes ago");
      expect(relativeTime(new Date("2023-12-31T23:00:00Z"))).toBe("1 hours ago");
    } finally {
      vi.useRealTimers();
    }
  });
});
