# Konfirmasi

Aplikasi Next.js untuk pelaporan prosedur konfirmasi cabang, dengan PostgreSQL untuk data dan akun serta penyimpanan lampiran lokal atau Backblaze B2.

## Fitur

- Role `super_user`, `accounting`, dan `admin_cabang`.
- Modul Customer Baru, Pemenuhan PO, dan Penagihan.
- Rekap input harian untuk Super User.
- Data Sales, Customer, Cabang, dan pengaturan user.
- Import Excel untuk data master.
- Lampiran gambar, PDF, Word, dan Excel.
- Accounting dan Admin Cabang dibatasi pada laporan milik sendiri di cabang yang ditugaskan.
- Super User dapat mengakses seluruh data dan cabang.
- Dashboard Super User menampilkan jumlah lampiran, kapasitas, dan kesehatan SMART HDD/SSD.

## Menjalankan Aplikasi

1. Salin `.env.example` menjadi `.env.production`.
2. Isi `DATABASE_URL` dan `SESSION_SECRET`.
3. Pilih penyimpanan lampiran:
   - `FILE_STORAGE_DRIVER=local` dan isi `FILE_STORAGE_PATH`; atau
   - isi kredensial Backblaze B2.
4. Isi `DATABASE_STORAGE_PATH` dengan lokasi filesystem data PostgreSQL untuk statistik SSD.
5. Jalankan `sudo bash scripts/setup-disk-health.sh` untuk mengaktifkan pemeriksaan SMART.
6. Terapkan skema dan jalankan aplikasi:

```bash
psql "$DATABASE_URL" -f database/schema.sql
npm install
npm run build
npm start
```

Untuk pengembangan:

```bash
npm install
npm run dev
```

## Migrasi dan Server

- `scripts/migrate-from-supabase.sh` memigrasikan akun dan data lama dari Supabase.
- `scripts/server-setup.sh` membantu menyiapkan PostgreSQL dan service systemd di Ubuntu.
- `scripts/update-backblaze.sh` memperbarui konfigurasi Backblaze secara interaktif.

File `.env.production`, database, hasil build, dan direktori lampiran tidak boleh dimasukkan ke Git.
