#!/usr/bin/env bash
set -euo pipefail

# intent: run uvicorn using PORT env (default 3004)
PORT=${PORT:-3004}
HOST=${HOST:-0.0.0.0}

if [ -d .venv ]; then
  # shellcheck source=/dev/null
  source .venv/bin/activate || true
fi

exec uvicorn app.main:app --host "$HOST" --port "$PORT" --no-access-log


