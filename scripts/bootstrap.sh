#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v python3 >/dev/null || { echo 'Python 3 is required. Install it using your preferred method, then retry.'; exit 1; }
source_root="${ARISESELL_SOURCE_PATH:-$(cd .. && pwd)/next-product-2/backend}"
test -f "$source_root/app/api/v1/marketplace.py" || { echo 'Set ARISESELL_SOURCE_PATH to your AriseSell backend with the marketplace bridge.'; exit 1; }
if ! test -x "$HOME/.cargo/bin/cargo"; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs -o /tmp/arise-store-rustup.sh
  sh /tmp/arise-store-rustup.sh -y --profile minimal --no-modify-path
fi
demo_python="$HOME/.cache/arise-digital-store-python"
python3 -m venv --without-pip "$demo_python"
if ! "$demo_python/bin/python" -m pip --version >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://bootstrap.pypa.io/get-pip.py -o /tmp/arise-store-get-pip.py
  "$demo_python/bin/python" /tmp/arise-store-get-pip.py --quiet
fi
"$demo_python/bin/python" -m pip install --quiet -r "$source_root/requirements.txt" aiosqlite 'fakeredis[lua]'
python3 scripts/setup.py
"$HOME/.cargo/bin/cargo" build --locked
echo 'Backend tools are ready. On Windows, run scripts/dev.ps1 to build the UI and start the local preview.'
