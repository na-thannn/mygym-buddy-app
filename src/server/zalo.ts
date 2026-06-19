import logDevError, { isDevLoggingEnabled } from "@/lib/error-logger";

export type ZaloEvent = "confirm" | "reminder" | "login";

export type ZaloSendResult = {
  sent: boolean;
  sandbox: boolean;
  deepLink: string;
  error?: string;
};

type ZaloConfig = {
  appId: string;
  appSecret: string;
  refreshToken: string;
  oaId: string;
  templates: Record<ZaloEvent, string | undefined>;
};

const OAUTH_URL = "https://oauth.zaloapp.com/v4/oa/access_token";
const SEND_URL = "https://openapi.zalo.me/v3.0/oa/message/template";

type TokenCache = { accessToken: string; refreshToken: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

export function resetZaloTokenCache(): void {
  tokenCache = null;
}

function readZaloConfig(): ZaloConfig | null {
  const appId = process.env.ZALO_OA_APP_ID?.trim();
  const appSecret = process.env.ZALO_OA_APP_SECRET?.trim();
  const refreshToken = process.env.ZALO_OA_REFRESH_TOKEN?.trim();
  if (!appId || !appSecret || !refreshToken) return null;
  return {
    appId,
    appSecret,
    refreshToken,
    oaId: process.env.ZALO_OA_ID?.trim() ?? "",
    templates: {
      confirm: process.env.ZALO_TEMPLATE_CONFIRM?.trim() || undefined,
      reminder: process.env.ZALO_TEMPLATE_REMINDER?.trim() || undefined,
      login: process.env.ZALO_TEMPLATE_LOGIN?.trim() || undefined,
    },
  };
}

// Vietnamese numbers are normalised to the 84 country code without a +, which is
// what the Zalo API expects for template sends.
export function normalizeZaloPhone(value: string): string {
  const digits = (value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `84${digits.slice(1)}`;
  return digits;
}

// A clickable fallback that opens a Zalo chat with the contact (or the OA) when
// live template sending is not configured.
export function buildZaloDeepLink(to: string, oaId?: string): string {
  const phone = normalizeZaloPhone(to);
  if (phone.length >= 6) return `https://zalo.me/${phone}`;
  if (oaId) return `https://zalo.me/${oaId}`;
  return "https://zalo.me";
}

export async function getZaloAccessToken(config: ZaloConfig): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) return tokenCache.accessToken;

  const body = new URLSearchParams({
    refresh_token: tokenCache?.refreshToken ?? config.refreshToken,
    app_id: config.appId,
    grant_type: "refresh_token",
  });
  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      secret_key: config.appSecret,
    },
    body,
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: string | number;
    error_name?: string;
  };
  if (!data.access_token) {
    throw new Error(data.error_name || "Zalo token refresh failed");
  }
  const expiresInSec = Number(data.expires_in ?? 3600);
  tokenCache = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? tokenCache?.refreshToken ?? config.refreshToken,
    expiresAt: now + (Number.isFinite(expiresInSec) ? expiresInSec : 3600) * 1000,
  };
  return tokenCache.accessToken;
}

export async function sendZaloEvent(input: {
  to: string;
  event: ZaloEvent;
  templateData: Record<string, string>;
}): Promise<ZaloSendResult> {
  const config = readZaloConfig();
  const deepLink = buildZaloDeepLink(input.to, config?.oaId);
  const templateId = config?.templates[input.event];

  // Sandbox mode: when credentials or the per-event template are missing we do
  // not call Zalo. Staff still get a working deep link to reach the guest.
  if (!config || !templateId) {
    if (isDevLoggingEnabled()) {
      console.warn(`[zalo sandbox] ${input.event} -> ${input.to} (${deepLink})`);
    }
    return { sent: false, sandbox: true, deepLink };
  }

  try {
    const accessToken = await getZaloAccessToken(config);
    const res = await fetch(SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: accessToken },
      body: JSON.stringify({
        phone: normalizeZaloPhone(input.to),
        template_id: templateId,
        template_data: input.templateData,
      }),
    });
    const data = (await res.json()) as { error?: number; message?: string };
    if (typeof data.error === "number" && data.error !== 0) {
      throw new Error(data.message || `Zalo send error ${data.error}`);
    }
    return { sent: true, sandbox: false, deepLink };
  } catch (error) {
    await logDevError({
      error,
      req: { method: "ZALO", url: input.event, body: { to: input.to } },
    }).catch(() => {});
    return {
      sent: false,
      sandbox: false,
      deepLink,
      error: error instanceof Error ? error.message : "Zalo send failed",
    };
  }
}
