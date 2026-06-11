import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

function isNodeRuntime(): boolean {
  return typeof process !== "undefined" && Boolean(process?.versions?.node);
}

function isDevRuntime(): boolean {
  return isNodeRuntime() && process.env.NODE_ENV !== "production";
}

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    // Persist dev error stack and request info to file (best-effort, dev only)
    if (isDevRuntime()) {
      try {
        const logger = await import("./lib/error-logger");
        const req =
          (globalThis as unknown as Record<string, unknown>).__LAST_REQUEST_FOR_ERROR || null;
        logger.logDevError({ error, req }).catch(() => {});
      } catch (e) {
        if (isDevRuntime()) {
          console.error("Failed to persist dev error", e);
        }
      }
    }
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => {
  const middleware = [errorMiddleware] as unknown[];

  // Register dev request logger so it's active in the middleware chain.
  if (isDevRuntime()) {
    try {
      const logger = createMiddleware().server(({ request, next }) => {
        try {
          console.error(
            "[start-debug] incoming",
            request?.method,
            request ? new URL(request.url).pathname : undefined,
          );
        } catch (err) {
          if (isDevRuntime()) {
            console.error("[start-debug] logger error", err);
          }
        }
        return next();
      });
      middleware.unshift(logger);
    } catch (err) {
      if (isDevRuntime()) {
        console.error("Failed to register start-debug logger", err);
      }
    }
  }

  // Dynamically import the CSRF middleware only when running in Node. We use
  // `import()` rather than `require()` because Vite evaluates source as ESM
  // and `require` is not defined there.
  if (isNodeRuntime()) {
    import("@tanstack/start-client-core")
      .then((mod) => {
        try {
          const csrf = mod.createCsrfMiddleware({
            filter: (ctx: unknown) => (ctx as Record<string, unknown>)?.handlerType === "serverFn",
          });
          // Insert CSRF middleware before the error middleware so it runs first.
          middleware.unshift(csrf);
        } catch (err) {
          if (isDevRuntime()) {
            console.error("Failed to initialize CSRF middleware:", err);
          }
        }
      })
      .catch((err) => {
        if (isDevRuntime()) {
          console.error("Failed to import @tanstack/start-client-core:", err);
        }
      });
  }

  return {
    requestMiddleware: middleware as unknown as ReturnType<typeof createMiddleware>[],
    serverFns: {
      // Ensure client-side server function RPC includes credentials (cookies)
      fetch: (input: string | URL | Request, init?: RequestInit) => {
        const f = (globalThis as unknown as { fetch?: typeof fetch }).fetch as (
          i: string | URL | Request,
          init?: RequestInit,
        ) => Promise<Response>;
        const merged: RequestInit = {
          ...(init || {}),
          credentials: (init && init.credentials) ?? "include",
        };
        return f(input as string | URL | Request, merged);
      },
    },
  };
});
