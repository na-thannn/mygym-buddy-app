#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations..."
./node_modules/.bin/drizzle-kit migrate || echo "[entrypoint] drizzle-kit migrate failed; src/server/db.ts will migrate on startup"

echo "[entrypoint] Starting Vite dev server on http://0.0.0.0:5173 ..."
exec node ./node_modules/vite/bin/vite.js dev --host 0.0.0.0 --port 5173 --strictPort
