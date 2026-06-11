import { describe, expect, it } from "vitest";
import { shouldRedirectForPasswordChange } from "./password-gate";

describe("password change gate", () => {
  it("blocks authenticated app routes until temporary password is changed", () => {
    expect(
      shouldRedirectForPasswordChange({
        mustChangePassword: true,
        pathname: "/feed",
      }),
    ).toBe(true);
  });

  it("allows the password change route itself", () => {
    expect(
      shouldRedirectForPasswordChange({
        mustChangePassword: true,
        pathname: "/change-password",
      }),
    ).toBe(false);
  });

  it("does not redirect users who already changed their password", () => {
    expect(
      shouldRedirectForPasswordChange({
        mustChangePassword: false,
        pathname: "/feed",
      }),
    ).toBe(false);
  });
});
