import "./lib/error-capture";
import logDevError, { isDevLoggingEnabled } from "./lib/error-logger";
import { appendFileSync, mkdirSync } from "fs";
import { dirname } from "path";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

function safeTypeOf(obj: unknown, key: string): string {
  try {
    if (!obj || typeof obj !== "object") return "undefined";
    const rec = obj as Record<string, unknown>;
    const v = rec[key];
    return typeof v;
  } catch {
    return "unknown";
  }
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  await logDevError({
    error: consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`),
    req: null,
  }).catch(() => {});
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      try {
        // Synchronous debug snapshot for problematic POST endpoints to ensure logging
        try {
          const url = (request as Request).url || "";
          const method = (request as Request).method || "";
          if (
            isDevLoggingEnabled() &&
            method === "POST" &&
            (url.endsWith("/api/signup") || url.endsWith("/api/signin"))
          ) {
            const logPath = "logs/req-snapshots.log";
            try {
              mkdirSync(dirname(logPath), { recursive: true });
            } catch {}
            const runtimeObj = (request as unknown as Record<string, unknown>)?.runtime;
            const inner = (request as unknown as Record<string, unknown>).request;
            const runtimeNode =
              runtimeObj && typeof runtimeObj === "object"
                ? (runtimeObj as Record<string, unknown>).node
                : undefined;
            const runtimeNodeReq =
              runtimeNode && typeof runtimeNode === "object"
                ? (runtimeNode as Record<string, unknown>).req
                : undefined;

            const innerKeys =
              inner && typeof inner === "object"
                ? Object.keys(inner as Record<string, unknown>).slice(0, 50)
                : undefined;
            const runtimeKeys =
              runtimeObj && typeof runtimeObj === "object"
                ? Object.keys(runtimeObj as Record<string, unknown>).slice(0, 50)
                : undefined;
            const runtimeSnapshot =
              runtimeObj && typeof runtimeObj === "object"
                ? Object.keys(runtimeObj as Record<string, unknown>).reduce(
                    (acc: Record<string, string>, k: string) => {
                      try {
                        acc[k] = safeTypeOf(runtimeObj, k);
                      } catch {}
                      return acc;
                    },
                    {},
                  )
                : undefined;

            const runtimeNodeKeys =
              runtimeNode && typeof runtimeNode === "object"
                ? Object.keys(runtimeNode as Record<string, unknown>).slice(0, 50)
                : undefined;
            const runtimeNodeSnapshot =
              runtimeNode && typeof runtimeNode === "object"
                ? Object.keys(runtimeNode as Record<string, unknown>).reduce(
                    (acc: Record<string, string>, k: string) => {
                      try {
                        acc[k] = safeTypeOf(runtimeNode, k);
                      } catch {}
                      return acc;
                    },
                    {},
                  )
                : undefined;

            const runtimeNodeReqKeys =
              runtimeNodeReq && typeof runtimeNodeReq === "object"
                ? Object.keys(runtimeNodeReq as Record<string, unknown>).slice(0, 50)
                : undefined;
            const runtimeNodeReqSnapshot =
              runtimeNodeReq && typeof runtimeNodeReq === "object"
                ? Object.keys(runtimeNodeReq as Record<string, unknown>).reduce(
                    (acc: Record<string, string>, k: string) => {
                      try {
                        acc[k] = safeTypeOf(runtimeNodeReq, k);
                      } catch {}
                      return acc;
                    },
                    {},
                  )
                : undefined;

            const snapshot = {
              ts: new Date().toISOString(),
              url,
              method,
              headers: Object.fromEntries(
                (request as Request).headers
                  ? Array.from((request as Request).headers.entries())
                  : [],
              ),
              keys: Object.keys(request as unknown as Record<string, unknown>).slice(0, 50),
              hasInner: !!inner,
              innerKeys,
              runtimeKeys,
              runtimeSnapshot,
              runtimeNodeKeys,
              runtimeNodeSnapshot,
              runtimeNodeReqKeys,
              runtimeNodeReqSnapshot,
            };
            try {
              appendFileSync(logPath, JSON.stringify(snapshot) + "\n", "utf8");
            } catch {
              // best-effort
            }
          }
        } catch {
          // ignore
        }
      } catch {}

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      if (typeof process !== "undefined" && process?.versions?.node) {
        try {
          const logger = await import("./lib/error-logger");
          const reqInfo = { method: (request as Request).method, url: (request as Request).url };
          await logger.logDevError({ error, req: reqInfo }).catch(() => {});
        } catch (e) {
          if (isDevLoggingEnabled()) {
            console.error("Failed to persist server error", e);
          }
        }
      }
      return brandedErrorResponse();
    }
  },
};
