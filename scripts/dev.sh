#!/usr/bin/env bash
# One-command local runner for CRE Comps Explorer
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="${BACKEND:-python}"   # python | dotnet
FE_PORT="${FE_PORT:-5173}"
API_PORT_PYTHON=8000
API_PORT_DOTNET=8001

export PATH="${HOME}/.dotnet:${PATH:-}"
export DOTNET_CLI_TELEMETRY_OPTOUT=1

echo "==> CRE Comps Explorer local run (backend=${BACKEND})"

if ! command -v pg_isready >/dev/null 2>&1; then
  echo "pg_isready not found; is PostgreSQL client installed?"
  exit 1
fi

if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
  echo "PostgreSQL is not accepting connections on localhost:5432"
  echo "Try: sudo service postgresql start"
  exit 1
fi

if [ -f "${HOME}/anaconda3/etc/profile.d/conda.sh" ]; then
  # conda activate scripts reference unset vars; nounset must be off briefly
  set +u
  # shellcheck disable=SC1091
  source "${HOME}/anaconda3/etc/profile.d/conda.sh"
  conda activate base >/dev/null 2>&1 || true
  set -u
fi

free_port() {
  local port=$1
  if ! command -v fuser >/dev/null 2>&1; then
    return 0
  fi
  if fuser "${port}/tcp" >/dev/null 2>&1; then
    echo "==> Port ${port} already in use — freeing it"
    fuser -k "${port}/tcp" >/dev/null 2>&1 || true
    sleep 0.6
  fi
}

echo "==> Seeding schema + sample data"
(
  cd "$ROOT"
  python backend/scripts/seed_comps.py
)

cleanup() {
  echo ""
  echo "==> Shutting down..."
  if [[ -n "${API_PID:-}" ]]; then
    kill "$API_PID" 2>/dev/null || true
    pkill -P "$API_PID" 2>/dev/null || true
  fi
  if [[ -n "${FE_PID:-}" ]]; then
    kill "$FE_PID" 2>/dev/null || true
    pkill -P "$FE_PID" 2>/dev/null || true
  fi
  # Ensure listeners are gone (covers orphaned uvicorn/vite children)
  free_port "$API_PORT"
  free_port "$FE_PORT"
}
trap cleanup EXIT INT TERM

if [[ "$BACKEND" == "dotnet" ]]; then
  API_PORT=$API_PORT_DOTNET
  API_BASE="http://127.0.0.1:${API_PORT}/api"
  LABEL=".NET / ASP.NET Core"
else
  API_PORT=$API_PORT_PYTHON
  API_BASE="http://127.0.0.1:${API_PORT}/api"
  LABEL="Python / FastAPI"
fi

free_port "$API_PORT"
free_port "$FE_PORT"

if [[ "$BACKEND" == "dotnet" ]]; then
  echo "==> Starting .NET API on :${API_PORT}"
  (
    cd "$ROOT/backend-dotnet/CreComps.Api"
    exec dotnet run --urls "http://127.0.0.1:${API_PORT}"
  ) &
  API_PID=$!
else
  echo "==> Starting FastAPI on :${API_PORT}"
  (
    cd "$ROOT/backend"
    exec uvicorn app.main:app --host 127.0.0.1 --port "$API_PORT" --reload
  ) &
  API_PID=$!
fi

echo "==> Waiting for API health..."
ready=0
for _ in $(seq 1 60); do
  if python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:${API_PORT}/api/health', timeout=1)" >/dev/null 2>&1 \
    || python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:${API_PORT}/api/health', timeout=1)" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 0.5
done
if [[ "$ready" -ne 1 ]]; then
  echo "API on :${API_PORT} did not become healthy in time."
  exit 1
fi

echo "==> Starting frontend on :${FE_PORT} → ${API_BASE}"
(
  cd "$ROOT/frontend"
  exec env VITE_API_BASE_URL="$API_BASE" VITE_BACKEND_LABEL="$LABEL" \
    npm run dev -- --host 127.0.0.1 --port "$FE_PORT" --strictPort
) &
FE_PID=$!

# Give Vite a moment; fail fast if the port dies
sleep 1
if ! kill -0 "$FE_PID" 2>/dev/null; then
  echo "Frontend failed to start on :${FE_PORT}."
  echo "Try: fuser -k ${FE_PORT}/tcp   then re-run."
  exit 1
fi

echo ""
echo "Ready:"
echo "  App:  http://127.0.0.1:${FE_PORT}"
echo "  API:  http://127.0.0.1:${API_PORT}"
echo "  Docs: http://127.0.0.1:${API_PORT}/docs   (Python) or /swagger (.NET)"
echo ""
echo "Examples:"
echo "  ./scripts/dev.sh"
echo "  BACKEND=dotnet FE_PORT=5174 ./scripts/dev.sh"
echo ""
echo "Press Ctrl+C to stop."

wait
