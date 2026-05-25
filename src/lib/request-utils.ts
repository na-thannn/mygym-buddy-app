import logDevError from "@/lib/error-logger";
import type { MaybeWrappedRequest, IncomingNodeReq } from "@/types/dev";

export async function parseRequestBody(request: unknown) {
  try {
    // If we're running under a wrapper that exposes the Node req object, read its stream
    const runtimeReq = (() => {
      try {
        const r = request as unknown as MaybeWrappedRequest;
        const runtime = r?.runtime;
        if (runtime && typeof runtime === "object") {
          const node = (runtime as Record<string, unknown>).node;
          if (node) return node as unknown;
        }
        const inner = r?.request as MaybeWrappedRequest | undefined;
        const innerRuntime =
          inner && typeof inner === "object"
            ? (inner as Record<string, unknown>).runtime
            : undefined;
        if (innerRuntime && typeof innerRuntime === "object")
          return (innerRuntime as Record<string, unknown>).node as unknown;
      } catch {}
      return undefined;
    })();
    if (runtimeReq && typeof (runtimeReq as IncomingNodeReq).on === "function") {
      try {
        const chunks: Buffer[] = [];
        // If the request has already been consumed, try to read cached properties
        if (
          (((runtimeReq as IncomingNodeReq)._consumed ||
            (runtimeReq as IncomingNodeReq)._consuming ||
            (runtimeReq as IncomingNodeReq)._dumped) as boolean) &&
          (runtimeReq as IncomingNodeReq)._cachedBody
        ) {
          try {
            return JSON.parse((runtimeReq as IncomingNodeReq)._cachedBody as string);
          } catch (_) {
            return {};
          }
        }

        // Try to read any buffered chunks left in Node's internal _readableState.buffer linked list
        try {
          const rs = (runtimeReq as unknown as IncomingNodeReq)._readableState as unknown;
          const bufferProp =
            rs && typeof rs === "object" ? (rs as Record<string, unknown>).buffer : undefined;
          const bufList =
            bufferProp &&
            typeof bufferProp === "object" &&
            "head" in (bufferProp as Record<string, unknown>)
              ? (bufferProp as Record<string, unknown>)
              : null;
          if (bufList && bufList.head) {
            let node: unknown = bufList.head;
            while (node) {
              const n = node as unknown as { data?: unknown; next?: unknown };
              if (n.data) {
                const d = n.data;
                if (typeof d === "string") {
                  chunks.push(Buffer.from(d));
                } else if (ArrayBuffer.isView(d)) {
                  chunks.push(Buffer.from((d as Uint8Array).buffer));
                } else if (d instanceof ArrayBuffer) {
                  chunks.push(Buffer.from(new Uint8Array(d)));
                } else if (Buffer.isBuffer(d)) {
                  chunks.push(Buffer.from(d));
                } else {
                  try {
                    chunks.push(Buffer.from(String(d)));
                  } catch {}
                }
              }
              node = n.next;
            }
            const buf = Buffer.concat(chunks);
            const txt = buf.toString("utf8");
            try {
              const parsed = txt ? JSON.parse(txt) : {};
              try {
                try {
                  (runtimeReq as unknown as IncomingNodeReq)._consumed = true;
                  (runtimeReq as unknown as IncomingNodeReq)._cachedBody = txt;
                } catch {}
              } catch {}
              return parsed;
            } catch (_) {
              return {};
            }
          }
        } catch (_) {
          // ignore internal buffer extraction errors
        }

        await new Promise<void>((resolve, reject) => {
          (runtimeReq as IncomingNodeReq).on!("data", (chunk: Buffer) =>
            chunks.push(Buffer.from(chunk)),
          );
          (runtimeReq as IncomingNodeReq).on!("end", () => resolve());
          (runtimeReq as IncomingNodeReq).on!("error", (err: unknown) => reject(err));
        });
        const buf = Buffer.concat(chunks);
        const txt = buf.toString("utf8");
        try {
          const parsed = txt ? JSON.parse(txt) : {};
          try {
            (runtimeReq as IncomingNodeReq)._consumed = true;
            (runtimeReq as IncomingNodeReq)._cachedBody = txt;
          } catch {}
          return parsed;
        } catch (_) {
          return {};
        }
      } catch (_) {
        // fallthrough to other strategies
      }
    }
    try {
      const reqAny = request as MaybeWrappedRequest;
      logDevError({
        error: new Error("parseRequestBody: entry"),
        req: {
          keys: Object.keys((reqAny as Record<string, unknown>) || {}).slice(0, 20),
          hasInner: !!reqAny?.request,
          innerKeys: reqAny?.request
            ? Object.keys(reqAny.request as Record<string, unknown>).slice(0, 20)
            : undefined,
        },
      }).catch(() => {});
    } catch (_) {}
  } catch (_) {}
  try {
    const outer = request as MaybeWrappedRequest;
    const inner = (outer as MaybeWrappedRequest)?.request ?? null;
    const candidates = [inner, outer].filter(Boolean);

    // Try json() then text() on both the inner and outer request objects
    for (const req of candidates) {
      if (!req) continue;
      if (typeof (req as MaybeWrappedRequest).json === "function") {
        try {
          return await (req as unknown as Request).json();
        } catch (_) {
          // fall through to other strategies
        }
      }

      if (typeof (req as MaybeWrappedRequest).text === "function") {
        try {
          const txt = await (req as unknown as Request).text();
          return txt ? JSON.parse(txt) : {};
        } catch (_) {
          // try next candidate
        }
      }
    }

    // Fallback to inspecting a body property on outer or inner
    const maybeBody = (outer as MaybeWrappedRequest).body ?? (inner as MaybeWrappedRequest)?.body;
    if (typeof maybeBody === "string") {
      try {
        return JSON.parse(maybeBody);
      } catch (_) {
        return {};
      }
    }

    if (maybeBody && (ArrayBuffer.isView(maybeBody) || maybeBody instanceof ArrayBuffer)) {
      try {
        const buf = ArrayBuffer.isView(maybeBody)
          ? new Uint8Array(maybeBody as unknown as ArrayBuffer)
          : new Uint8Array(maybeBody as unknown as ArrayBuffer);
        const txt = new TextDecoder().decode(buf);
        return txt ? JSON.parse(txt) : {};
      } catch (_) {
        return {};
      }
    }

    if (
      maybeBody &&
      typeof (maybeBody as unknown as { getReader?: unknown }).getReader === "function"
    ) {
      try {
        const reader = (
          maybeBody as unknown as { getReader: () => ReadableStreamDefaultReader<Uint8Array> }
        ).getReader();
        const chunks: Uint8Array[] = [];
        // read stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
        const total = chunks.reduce((s, c) => s + (c?.length || 0), 0);
        const combined = new Uint8Array(total);
        let offset = 0;
        for (const c of chunks) {
          combined.set(c, offset);
          offset += c.length;
        }
        const txt = new TextDecoder().decode(combined);
        return txt ? JSON.parse(txt) : {};
      } catch (_) {
        return {};
      }
    }

    if (maybeBody && typeof maybeBody === "object") return maybeBody;
  } catch (_) {
    // fallthrough
  }

  try {
    if (request) {
      const reqAny = request as MaybeWrappedRequest;
      const reqInfo = {
        hasRequestProp: !!reqAny.request,
        requestKeys: Object.keys(reqAny as Record<string, unknown>).slice(0, 20),
        bodyType: typeof reqAny?.body,
        reqJsonType: reqAny?.request && typeof (reqAny.request as unknown as Request).json,
        reqTextType: reqAny?.request && typeof (reqAny.request as unknown as Request).text,
      };
      await logDevError({ error: new Error("parseRequestBody: empty body"), req: reqInfo }).catch(
        () => {},
      );
    }
  } catch (_) {
    // ignore
  }

  return {};
}
