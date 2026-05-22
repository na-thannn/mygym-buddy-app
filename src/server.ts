import "./lib/error-capture";
import logDevError from './lib/error-logger';
import { appendFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
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

  await logDevError({ error: consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`), req: null }).catch(() => {});
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      try {
        // Synchronous debug snapshot for problematic POST endpoints to ensure logging
        try {
          const url = (request as Request).url || '';
          const method = (request as Request).method || '';
          if (method === 'POST' && (url.endsWith('/api/signup') || url.endsWith('/api/signin'))) {
            const logPath = 'logs/req-snapshots.log';
            try {
              mkdirSync(dirname(logPath), { recursive: true });
            } catch {}
            const runtimeObj = (request as any).runtime;
            const snapshot = {
              ts: new Date().toISOString(),
              url,
              method,
              headers: Object.fromEntries((request as Request).headers ? Array.from((request as Request).headers.entries()) : []),
              keys: Object.keys(request as any).slice(0, 50),
              hasInner: !!(request as any).request,
              innerKeys: (request as any).request ? Object.keys((request as any).request).slice(0, 50) : undefined,
              runtimeKeys: runtimeObj ? Object.keys(runtimeObj).slice(0, 50) : undefined,
              runtimeSnapshot: runtimeObj && typeof runtimeObj === 'object' ? Object.keys(runtimeObj).reduce((acc: any, k: string) => { try { acc[k] = typeof (runtimeObj as any)[k]; } catch {} return acc; }, {}) : undefined,
              runtimeNodeKeys: runtimeObj && runtimeObj.node ? Object.keys(runtimeObj.node).slice(0,50) : undefined,
              runtimeNodeSnapshot: runtimeObj && runtimeObj.node && typeof runtimeObj.node === 'object' ? Object.keys(runtimeObj.node).reduce((acc: any, k: string) => { try { acc[k] = typeof (runtimeObj.node as any)[k]; } catch {} return acc; }, {}) : undefined,
              runtimeNodeReqKeys: runtimeObj && runtimeObj.node && runtimeObj.node.req ? Object.keys(runtimeObj.node.req).slice(0,50) : undefined,
              runtimeNodeReqSnapshot: runtimeObj && runtimeObj.node && runtimeObj.node.req && typeof runtimeObj.node.req === 'object' ? Object.keys(runtimeObj.node.req).reduce((acc: any, k: string) => { try { acc[k] = typeof (runtimeObj.node.req as any)[k]; } catch {} return acc; }, {}) : undefined,
            };
            try {
              appendFileSync(logPath, JSON.stringify(snapshot) + '\n', 'utf8');
            } catch (e) {
              // best-effort
            }
          }
        } catch (e) {
          // ignore
        }
      } catch (e) {}

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
        if (typeof process !== 'undefined' && process?.versions?.node) {
          try {
            const logger = await import('./lib/error-logger');
            const reqInfo = { method: (request as Request).method, url: (request as Request).url };
            await logger.logDevError({ error, req: reqInfo }).catch(() => {});
          } catch (e) {
            console.error('Failed to persist server error', e);
          }
        }
        return brandedErrorResponse();
    }
  },
};