// Shared Vite configuration includes the common plugins used by this
// template — do NOT add them manually or the app may suffer duplicate
// plugins. Pass additional config via defineConfig({ vite: { ... } }) if
// needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    // Runtime env is loaded explicitly from .env by the npm scripts.
    // Keep Vite/TanStack from also loading .env, .env.local, or mode-specific env files.
    // @ts-expect-error The Lovable TanStack wrapper forwards this Vite runtime option.
    envFile: false,
    resolve: {
      alias: {
        // shim node:async_hooks in the browser to prevent Vite externalization runtime errors
        "node:async_hooks": fileURLToPath(
          new URL("./src/shims/async_hooks_shim.js", import.meta.url),
        ),
      },
    },
  },
});
