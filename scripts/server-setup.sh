#!/usr/bin/env bash
set -euo pipefail

APP_USER="${APP_USER:-andre}"
APP_DIR="${APP_DIR:-/home/$APP_USER/apps/konfirmasi}"
APP_PORT="${APP_PORT:-3100}"
DB_NAME="konfirmasi"
DB_USER="konfirmasi"

if [[ "$(id -un)" != "$APP_USER" ]]; then
  echo "Jalankan skrip ini sebagai user $APP_USER." >&2
  exit 1
fi
if [[ ! -f "$APP_DIR/package.json" ]]; then
  echo "Kode aplikasi tidak ditemukan di $APP_DIR." >&2
  exit 1
fi

DB_PASSWORD="$(openssl rand -hex 24)"
SESSION_SECRET="$(openssl rand -hex 48)"

B2_ENDPOINT="https://s3.eu-central-003.backblazeb2.com"
B2_REGION="eu-central-003"
B2_BUCKET="konfirmasi"
B2_KEY_ID=""
B2_APP_KEY=""
read -rp "Konfigurasi Backblaze B2 sekarang? [y/N]: " CONFIGURE_B2
if [[ "$CONFIGURE_B2" =~ ^[Yy]$ ]]; then
  read -rp "Backblaze endpoint [$B2_ENDPOINT]: " VALUE
  B2_ENDPOINT="${VALUE:-$B2_ENDPOINT}"
  read -rp "Backblaze region [$B2_REGION]: " VALUE
  B2_REGION="${VALUE:-$B2_REGION}"
  read -rp "Backblaze bucket [$B2_BUCKET]: " VALUE
  B2_BUCKET="${VALUE:-$B2_BUCKET}"
  read -rp "Backblaze Key ID: " B2_KEY_ID
  read -rsp "Backblaze Application Key: " B2_APP_KEY
  echo
else
  echo "Backblaze dilewati. Aplikasi dan migrasi database tetap dilanjutkan."
fi

echo "Membuat role dan database PostgreSQL..."
sudo -u postgres psql -v ON_ERROR_STOP=1 --set=db_user="$DB_USER" --set=db_password="$DB_PASSWORD" <<'SQL'
select format('create role %I login password %L', :'db_user', :'db_password')
where not exists (select 1 from pg_roles where rolname = :'db_user') \gexec
select format('alter role %I password %L', :'db_user', :'db_password') \gexec
SQL

if ! sudo -u postgres psql -Atc "select 1 from pg_database where datname = '$DB_NAME'" | grep -qx 1; then
  sudo -u postgres createdb --owner="$DB_USER" "$DB_NAME"
fi
PGPASSWORD="$DB_PASSWORD" psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -f "$APP_DIR/database/schema.sql"

umask 077
cat > "$APP_DIR/.env.production" <<EOF
NODE_ENV=production
PORT=$APP_PORT
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME
DATABASE_POOL_SIZE=10
SESSION_SECRET=$SESSION_SECRET
BACKBLAZE_ENDPOINT=$B2_ENDPOINT
BACKBLAZE_REGION=$B2_REGION
BACKBLAZE_BUCKET=$B2_BUCKET
BACKBLAZE_KEY_ID=$B2_KEY_ID
BACKBLAZE_APPLICATION_KEY=$B2_APP_KEY
EOF

echo "Menginstal dan membangun aplikasi..."
cd "$APP_DIR"
npm install
npm run build

echo "Memasang service systemd..."
sudo tee /etc/systemd/system/konfirmasi.service >/dev/null <<EOF
[Unit]
Description=Aplikasi Konfirmasi
After=network.target postgresql.service

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env.production
ExecStart=/usr/bin/npm start -- --hostname 127.0.0.1 --port $APP_PORT
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable konfirmasi.service

echo "Setup selesai. Jalankan migrasi data sebelum menyalakan layanan:"
echo "  bash $APP_DIR/scripts/migrate-from-supabase.sh"
echo "Setelah migrasi: sudo systemctl start konfirmasi"
