#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
demo_python="$HOME/.cache/arise-digital-store-python/bin/python"
test -x "$demo_python" && test -x "$HOME/.cargo/bin/cargo" || { echo 'Run bash scripts/bootstrap.sh first.'; exit 1; }
test -f web/dist/index.html || { echo 'Build the web UI first: cd web && npm ci && npm run build'; exit 1; }
"$demo_python" scripts/demo_source.py &
source_pid=$!
trap 'kill "$source_pid" 2>/dev/null || true' EXIT INT TERM
"$demo_python" -c 'import time,urllib.request
for attempt in range(30):
 try:
  urllib.request.urlopen("http://127.0.0.1:8111/health",timeout=1);break
 except OSError: time.sleep(1)
else: raise SystemExit("The isolated AriseSell source did not start")'
"$HOME/.cargo/bin/cargo" run --locked
