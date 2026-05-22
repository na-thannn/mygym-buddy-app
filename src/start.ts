import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
    } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    // Persist dev error stack and request info to file (best-effort, dev only)
    if (typeof process !== 'undefined' && process?.versions?.node) {
      try {
        const logger = await import('./lib/error-logger');
        const req = (globalThis as any).__LAST_REQUEST_FOR_ERROR || null;
        logger.logDevError({ error, req }).catch(() => {});
      } catch (e) {
        console.error('Failed to persist dev error', e);
      }
    }
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Dev-only request logger to help capture intermittent SSR/runtime errors.
if (process.env.NODE_ENV !== 'production') {
  createMiddleware().server(({ request, next }) => {
    try {
      console.error('[start-debug] incoming', request?.method, request ? new URL(request.url).pathname : undefined);
    } catch {}
    return next();
  });
}

export const startInstance = createStart(() => {
  const middleware = [errorMiddleware] as any[];

  // Register dev request logger so it's active in the middleware chain.
  if (process.env.NODE_ENV !== 'production') {
    try {
      const logger = createMiddleware().server(({ request, next }) => {
        try {
          console.error('[start-debug] incoming', request?.method, request ? new URL(request.url).pathname : undefined);
        } catch (err) {
          console.error('[start-debug] logger error', err);
        }
        return next();
      });
      middleware.unshift(logger);
    } catch (err) {
      console.error('Failed to register start-debug logger', err);
    }
  }

  // Dynamically import the CSRF middleware only when running in Node. We use
  // `import()` rather than `require()` because Vite evaluates source as ESM
  // and `require` is not defined there.
  if (typeof process !== "undefined" && process?.versions?.node) {
    import("@tanstack/start-client-core")
      .then((mod) => {
        try {
          const csrf = mod.createCsrfMiddleware({
            filter: (ctx: any) => ctx.handlerType === "serverFn",
          });
          // Insert CSRF middleware before the error middleware so it runs first.
          middleware.unshift(csrf);
        } catch (err) {
          console.error("Failed to initialize CSRF middleware:", err);
        }
      })
      .catch((err) => {
        console.error("Failed to import @tanstack/start-client-core:", err);
      });
  }

  return {
    requestMiddleware: middleware,
    serverFns: {
      // Ensure client-side server function RPC includes credentials (cookies)
      fetch: (url: string, init?: RequestInit, origFetch?: typeof fetch) => {
        const f = origFetch ?? fetch;
        const merged: RequestInit = { ...(init || {}), credentials: (init && init.credentials) ?? 'include' };
        return f(url, merged);
      },
    },
  };
});
