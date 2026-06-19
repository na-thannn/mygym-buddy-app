import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildZaloDeepLink,
  getZaloAccessToken,
  normalizeZaloPhone,
  resetZaloTokenCache,
  sendZaloEvent,
} from "./zalo";

const mocks = vi.hoisted(() => ({
  logDevError: vi.fn(),
  isDevLoggingEnabled: vi.fn(),
}));

vi.mock("@/lib/error-logger", () => ({
  default: mocks.logDevError,
  isDevLoggingEnabled: mocks.isDevLoggingEnabled,
}));

const ZALO_ENV_KEYS = [
  "ZALO_OA_ID",
  "ZALO_OA_APP_ID",
  "ZALO_OA_APP_SECRET",
  "ZALO_OA_REFRESH_TOKEN",
  "ZALO_TEMPLATE_CONFIRM",
  "ZALO_TEMPLATE_REMINDER",
  "ZALO_TEMPLATE_LOGIN",
];

describe("normalizeZaloPhone", () => {
  it("converts a leading zero to the 84 country code", () => {
    expect(normalizeZaloPhone("0901234567")).toBe("84901234567");
  });

  it("strips non-digits from formatted numbers", () => {
    expect(normalizeZaloPhone("+84 90 123 4567")).toBe("84901234567");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeZaloPhone("")).toBe("");
  });
});

describe("buildZaloDeepLink", () => {
  it("links to the contact phone when present", () => {
    expect(buildZaloDeepLink("0901234567")).toBe("https://zalo.me/84901234567");
  });

  it("falls back to the OA id when there is no phone", () => {
    expect(buildZaloDeepLink("", "hlfitness-oa")).toBe("https://zalo.me/hlfitness-oa");
  });

  it("falls back to the bare domain with neither phone nor OA", () => {
    expect(buildZaloDeepLink("")).toBe("https://zalo.me");
  });
});

describe("sendZaloEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetZaloTokenCache();
    for (const key of ZALO_ENV_KEYS) delete process.env[key];
    mocks.logDevError.mockResolvedValue(undefined);
    mocks.isDevLoggingEnabled.mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("runs in sandbox mode and returns a deep link when credentials are missing", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendZaloEvent({
      to: "0901234567",
      event: "confirm",
      templateData: { name: "Minh" },
    });

    expect(result).toEqual({
      sent: false,
      sandbox: true,
      deepLink: "https://zalo.me/84901234567",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends a live template message when credentials and a template are configured", async () => {
    process.env.ZALO_OA_APP_ID = "app-1";
    process.env.ZALO_OA_APP_SECRET = "secret-1";
    process.env.ZALO_OA_REFRESH_TOKEN = "refresh-1";
    process.env.ZALO_TEMPLATE_CONFIRM = "tpl-confirm";

    const fetchSpy = vi.fn(async (url: string) => {
      if (String(url).includes("oauth")) {
        return new Response(JSON.stringify({ access_token: "access-1", expires_in: "3600" }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ error: 0, message: "Success" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendZaloEvent({
      to: "0901234567",
      event: "confirm",
      templateData: { name: "Minh" },
    });

    expect(result.sent).toBe(true);
    expect(result.sandbox).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("returns an unsent result when the Zalo API reports an error", async () => {
    process.env.ZALO_OA_APP_ID = "app-1";
    process.env.ZALO_OA_APP_SECRET = "secret-1";
    process.env.ZALO_OA_REFRESH_TOKEN = "refresh-1";
    process.env.ZALO_TEMPLATE_CONFIRM = "tpl-confirm";

    const fetchSpy = vi.fn(async (url: string) => {
      if (String(url).includes("oauth")) {
        return new Response(JSON.stringify({ access_token: "access-1", expires_in: "3600" }), {
          status: 200,
        });
      }
      return new Response(JSON.stringify({ error: -124, message: "Invalid template" }), {
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await sendZaloEvent({
      to: "0901234567",
      event: "confirm",
      templateData: { name: "Minh" },
    });

    expect(result.sent).toBe(false);
    expect(result.sandbox).toBe(false);
    expect(result.error).toContain("Invalid template");
    expect(mocks.logDevError).toHaveBeenCalled();
  });
});

describe("getZaloAccessToken", () => {
  const config = {
    appId: "app-1",
    appSecret: "secret-1",
    refreshToken: "refresh-1",
    oaId: "",
    templates: { confirm: undefined, reminder: undefined, login: undefined },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetZaloTokenCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refreshes and caches the access token", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify({ access_token: "access-1", expires_in: "3600" }), {
          status: 200,
        }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const first = await getZaloAccessToken(config);
    const second = await getZaloAccessToken(config);

    expect(first).toBe("access-1");
    expect(second).toBe("access-1");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("throws when the refresh response has no access token", async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(JSON.stringify({ error_name: "invalid_refresh_token" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    await expect(getZaloAccessToken(config)).rejects.toThrow("invalid_refresh_token");
  });
});
