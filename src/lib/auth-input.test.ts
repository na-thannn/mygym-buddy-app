import { describe, expect, it } from "vitest";
import { authEmailSchema } from "./auth-input";

describe("auth email input", () => {
  it("trims and lowercases emails before auth lookup or storage", () => {
    expect(authEmailSchema.parse("  Member.Name+Trial@Example.COM  ")).toBe(
      "member.name+trial@example.com",
    );
  });

  it("rejects malformed email addresses", () => {
    expect(() => authEmailSchema.parse("not-an-email")).toThrow();
  });

  it("rejects emails longer than 255 characters", () => {
    const longEmail = `${"a".repeat(244)}@example.com`;

    expect(longEmail).toHaveLength(256);
    expect(() => authEmailSchema.parse(longEmail)).toThrow();
  });
});
