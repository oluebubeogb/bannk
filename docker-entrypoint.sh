#!/bin/sh
set -e
echo "[bannk] applying database migrations…"
npx --no-install prisma migrate deploy
echo "[bannk] starting Next.js on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec npx --no-install next start -H "${HOSTNAME:-0.0.0.0}" -p "${PORT:-3000}"
