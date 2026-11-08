#!/bin/sh
set -e

if [ "${MIGRATIONS_AUTO:-true}" != "false" ]; then
  echo "[entrypoint] running migrations..."
  node /app/dist/db/migrate.js
fi

echo "[entrypoint] starting server..."
exec node /app/dist/index.js
