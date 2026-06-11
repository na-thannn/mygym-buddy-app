import { describe, expect, it } from "vitest";
import { canUsePublicSignup, PUBLIC_SIGNUP_DISABLED_ERROR } from "./signup-policy";

describe("signup policy", () => {
  it("rejects normal public account creation", () => {
    expect(canUsePublicSignup(false)).toBe(false);
    expect(PUBLIC_SIGNUP_DISABLED_ERROR).toBe(
      "Public sign up is disabled. Please request a coach meeting.",
    );
  });

  it("allows explicit bootstrap mode only", () => {
    expect(canUsePublicSignup(true)).toBe(true);
  });
});
