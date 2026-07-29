#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/andre/apps/konfirmasi}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ ! -f "$APP_DIR/.env.production" ]]; then
  echo "File environment tidak ditemukan: $APP_DIR/.env.production" >&2
  exit 1
fi

set -a
source "$APP_DIR/.env.production"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL belum tersedia di $APP_DIR/.env.production" >&2
  exit 1
fi

read -rsp "Tempel connection string PostgreSQL Supabase sumber: " SOURCE_URL
echo
SOURCE_URL="${SOURCE_URL//$'\r'/}"
SOURCE_URL="${SOURCE_URL#${SOURCE_URL%%[![:space:]]*}}"
SOURCE_URL="${SOURCE_URL%${SOURCE_URL##*[![:space:]]}}"
if [[ "$SOURCE_URL" =~ ^psql[[:space:]]+[\"\'](postgres(ql)?://[^\"\']+)[\"\']$ ]]; then
  SOURCE_URL="${BASH_REMATCH[1]}"
elif [[ "$SOURCE_URL" =~ ^[\"\'](postgres(ql)?://[^\"\']+)[\"\']$ ]]; then
  SOURCE_URL="${BASH_REMATCH[1]}"
fi
if [[ "$SOURCE_URL" != postgres://* && "$SOURCE_URL" != postgresql://* && "$SOURCE_URL" != *"host="* ]]; then
  echo "Connection string tidak valid." >&2
  echo "Salin URI pada Connect > Session pooler, atau salin perintah psql lengkap." >&2
  exit 1
fi

echo "Memeriksa koneksi sumber..."
psql "$SOURCE_URL" -v ON_ERROR_STOP=1 -Atc "select 'ok'" >/dev/null

echo "Mengosongkan tabel tujuan agar migrasi dapat diulang dengan aman..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  "truncate penagihan_reports, pemenuhan_po_reports, customer_baru_reports, data_customers, data_sales, profile_branches, profiles, branches, app_users restart identity cascade"

echo "Memigrasikan akun dan hash password..."
psql "$SOURCE_URL" -v ON_ERROR_STOP=1 -c "\copy (
  select id, email, coalesce(encrypted_password, '!'), coalesce(raw_user_meta_data->>'full_name', ''), created_at, updated_at
  from auth.users where email is not null
) to '$TMP_DIR/app_users.csv' with (format csv)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
create temporary table imported_users (
  id uuid, email text, password_hash text, full_name text, created_at timestamptz, updated_at timestamptz
);
\copy imported_users from '$TMP_DIR/app_users.csv' with (format csv)
insert into app_users (id, email, password_hash, full_name, created_at, updated_at)
select id, email, password_hash, full_name, created_at, updated_at from imported_users;
SQL

tables=(
  branches
  profiles
  profile_branches
  data_sales
  data_customers
  customer_baru_reports
  pemenuhan_po_reports
  penagihan_reports
)

for table in "${tables[@]}"; do
  echo "Memigrasikan public.$table..."
  pg_dump "$SOURCE_URL" --data-only --no-owner --no-privileges --column-inserts --table="public.$table" > "$TMP_DIR/$table.sql"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$TMP_DIR/$table.sql" >/dev/null
done

echo "Menyelaraskan nama akun dari profiles..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  "update app_users u set full_name = p.full_name, email = p.email, updated_at = now() from profiles p where p.id = u.id"

echo "Verifikasi jumlah baris tujuan:"
psql "$DATABASE_URL" -P pager=off -c \
  "select 'app_users' tabel, count(*) jumlah from app_users
   union all select 'branches', count(*) from branches
   union all select 'profiles', count(*) from profiles
   union all select 'profile_branches', count(*) from profile_branches
   union all select 'data_sales', count(*) from data_sales
   union all select 'data_customers', count(*) from data_customers
   union all select 'customer_baru_reports', count(*) from customer_baru_reports
   union all select 'pemenuhan_po_reports', count(*) from pemenuhan_po_reports
   union all select 'penagihan_reports', count(*) from penagihan_reports order by tabel"

echo "Migrasi selesai. Password lama Supabase tetap dapat dipakai bila akun memakai login email/password."
