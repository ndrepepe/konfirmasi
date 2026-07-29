#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${APP_DIR:-/home/andre/apps/konfirmasi}/.env.production"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "File environment belum tersedia: $ENV_FILE" >&2
  exit 1
fi

read -rp "Backblaze endpoint [https://s3.eu-central-003.backblazeb2.com]: " ENDPOINT
ENDPOINT="${ENDPOINT:-https://s3.eu-central-003.backblazeb2.com}"
read -rp "Backblaze region [eu-central-003]: " REGION
REGION="${REGION:-eu-central-003}"
read -rp "Backblaze bucket [konfirmasi]: " BUCKET
BUCKET="${BUCKET:-konfirmasi}"
read -rp "Backblaze Key ID: " KEY_ID
read -rsp "Backblaze Application Key: " APP_KEY
echo

python3 - "$ENV_FILE" "$ENDPOINT" "$REGION" "$BUCKET" "$KEY_ID" "$APP_KEY" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
updates = dict(zip(
    ["BACKBLAZE_ENDPOINT", "BACKBLAZE_REGION", "BACKBLAZE_BUCKET", "BACKBLAZE_KEY_ID", "BACKBLAZE_APPLICATION_KEY"],
    sys.argv[2:],
))
lines = path.read_text().splitlines()
seen = set()
result = []
for line in lines:
    key = line.split("=", 1)[0] if "=" in line else ""
    if key in updates:
        result.append(f"{key}={updates[key]}")
        seen.add(key)
    else:
        result.append(line)
for key, value in updates.items():
    if key not in seen:
        result.append(f"{key}={value}")
path.write_text("\n".join(result) + "\n")
PY
chmod 600 "$ENV_FILE"
sudo systemctl restart konfirmasi
echo "Kredensial Backblaze diperbarui dan layanan direstart."
