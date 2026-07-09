# Aplikasi Konfirmasi Prosedur

Aplikasi web Next.js untuk pelaporan prosedur konfirmasi cabang dengan Supabase Auth, database Supabase, role-based access, dan upload lampiran ke Backblaze B2 via S3 compatible API.

## Fitur

- Login email dan password memakai Supabase Auth.
- Role: `super_user`, `accounting`, dan `admin_cabang`.
- Super user mengakses semua menu, termasuk Seting User dan Data Cabang.
- Accounting mengakses semua data cabang dan semua menu laporan.
- Admin cabang hanya mengakses Pemenuhan PO untuk cabangnya sendiri.
- Modul laporan: Customer Baru, Pemenuhan PO, Penagihan.
- Lampiran disimpan ke Backblaze B2, bukan ke browser/client.

## Setup

1. Buat project Supabase.
2. Jalankan SQL di `supabase/schema.sql` melalui Supabase SQL Editor.
3. Isi `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BACKBLAZE_ENDPOINT=https://s3.us-west-004.backblazeb2.com
BACKBLAZE_REGION=us-west-004
BACKBLAZE_BUCKET=
BACKBLAZE_KEY_ID=
BACKBLAZE_APPLICATION_KEY=
```

4. Buat user pertama di Supabase Auth, lalu masukkan profile super user pertama via SQL:

```sql
insert into public.profiles (id, full_name, email, role, branch_id)
values ('AUTH_USER_ID', 'Nama Super User', 'email@domain.com', 'super_user', null);
```

5. Jalankan aplikasi:

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Catatan Backblaze

Gunakan bucket private. Aplikasi menyimpan metadata file ke Supabase dalam bentuk JSON berisi key, nama file, tipe file, dan ukuran. File upload diproses di server action agar credential Backblaze tidak dikirim ke browser.

Key Backblaze yang pernah dibagikan di chat sebaiknya di-rotate sebelum production.
