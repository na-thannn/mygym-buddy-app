import logDevError from '@/lib/error-logger';

export async function parseRequestBody(request: any) {
  try {
    // If we're running under a wrapper that exposes the Node req object, read its stream
    const runtimeReq = request?.runtime?.node?.req ?? request?.request?.runtime?.node?.req;
    if (runtimeReq && typeof runtimeReq.on === 'function') {
      try {
        const chunks: Buffer[] = [];
        // If the request has already been consumed, try to read cached properties
        if (((runtimeReq as any)._consumed || (runtimeReq as any)._consuming || (runtimeReq as any)._dumped) && (runtimeReq as any)._cachedBody) {
          try {
            return JSON.parse((runtimeReq as any)._cachedBody);
          } catch (_) {
            return {};
          }
        }

        // Try to read any buffered chunks left in Node's internal _readableState.buffer linked list
        try {
          const rs = (runtimeReq as any)._readableState;
          const bufList = rs && rs.buffer && rs.buffer.head ? rs.buffer : null;
          if (bufList && bufList.head) {
            let node = bufList.head;
            while (node) {
              if (node.data) chunks.push(Buffer.from(node.data));
              node = node.next;
            }
            const buf = Buffer.concat(chunks);
            const txt = buf.toString('utf8');
            try {
              const parsed = txt ? JSON.parse(txt) : {};
              try {
                (runtimeReq as any)._consumed = true;
                (runtimeReq as any)._cachedBody = txt;
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
          runtimeReq.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
          runtimeReq.on('end', () => resolve());
          runtimeReq.on('error', (err: unknown) => reject(err));
        });
        const buf = Buffer.concat(chunks);
        const txt = buf.toString('utf8');
        try {
          const parsed = txt ? JSON.parse(txt) : {};
          try {
            (runtimeReq as any)._consumed = true;
            (runtimeReq as any)._cachedBody = txt;
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
      logDevError({ error: new Error('parseRequestBody: entry'), req: { keys: Object.keys(request || {}).slice(0, 20), hasInner: !!request?.request, innerKeys: request?.request ? Object.keys(request.request).slice(0, 20) : undefined } }).catch(() => {});
    } catch (_) {}
  } catch (_) {}
  try {
    const outer = request;
    const inner = request?.request ?? null;
    const candidates = [inner, outer].filter(Boolean);

    // Try json() then text() on both the inner and outer request objects
    for (const req of candidates) {
      if (!req) continue;
      if (typeof (req as any).json === 'function') {
        try {
          return await (req as any).json();
        } catch (_) {
          // fall through to other strategies
        }
      }

      if (typeof (req as any).text === 'function') {
        try {
          const txt = await (req as any).text();
          return txt ? JSON.parse(txt) : {};
        } catch (_) {
          // try next candidate
        }
      }
    }

    // Fallback to inspecting a body property on outer or inner
    const maybeBody = (outer as any).body ?? (inner as any)?.body;
    if (typeof maybeBody === 'string') {
      try {
        return JSON.parse(maybeBody);
      } catch (_) {
        return {};
      }
    }

    if (maybeBody && (ArrayBuffer.isView(maybeBody) || maybeBody instanceof ArrayBuffer)) {
      try {
        const buf = ArrayBuffer.isView(maybeBody) ? new Uint8Array(maybeBody as any) : new Uint8Array(maybeBody as ArrayBuffer);
        const txt = new TextDecoder().decode(buf);
        return txt ? JSON.parse(txt) : {};
      } catch (_) {
        return {};
      }
    }

    if (maybeBody && typeof maybeBody.getReader === 'function') {
      try {
        const reader = maybeBody.getReader();
        const chunks: Uint8Array[] = [];
        // read stream
        while (true) {
          // eslint-disable-next-line no-await-in-loop
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

    if (maybeBody && typeof maybeBody === 'object') return maybeBody;
  } catch (_) {
    // fallthrough
  }

  try {
    if (request) {
      const reqInfo = {
        hasRequestProp: !!request.request,
        requestKeys: Object.keys(request).slice(0, 20),
        bodyType: typeof request?.body,
        reqJsonType: request?.request && typeof request.request.json,
        reqTextType: request?.request && typeof request.request.text,
      };
      await logDevError({ error: new Error('parseRequestBody: empty body'), req: reqInfo }).catch(() => {});
    }
  } catch (_) {
    // ignore
  }

  return {};
}
