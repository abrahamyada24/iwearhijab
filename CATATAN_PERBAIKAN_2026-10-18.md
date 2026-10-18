# Perbaikan KasirPOS — 18 Oktober 2026

## Perubahan

- Tombol Simpan Pengaturan tetap terlihat saat scroll, termasuk layar mobile. Draft tidak ditimpa ketika data pengaturan dimuat ulang di latar belakang.
- Perubahan belum tersimpan ditandai. Pindah menu, tab pengaturan, logout, dan ganti usaha meminta pilihan Simpan dan lanjutkan / Buang perubahan / Tetap di sini. Kegagalan menyimpan menahan pengguna di halaman saat ini. Refresh/tutup tab memakai peringatan bawaan browser.
- Harga produk memakai Rp, Harga Jual, dan Harga Pokok (HPP).
- Nomor telepon member divalidasi pada web, Android, dan backend. Huruf ditolak; nomor disimpan sebagai teks. Format 08…, 62…, dan +62… dinormalisasi agar pengecekan duplikat juga mengenali data lama dalam ketiga format tersebut. Data historis tidak diubah massal.
- Rincian kategori laba rugi membaca `amount` dari API, sehingga cocok dengan total pengeluaran. Rincian juga disertakan dalam ekspor CSV/PDF.
- Tombol Tambah Diskon membuka modal yang sudah tersedia. Nominal/persen diterapkan sebelum pajak, diteruskan ke server, disimpan dalam transaksi pending, dan ditampilkan pada struk. Backend menolak nilai tidak valid serta membatasi diskon agar tagihan tidak negatif.
- Transaksi member menyimpan snapshot poin didapat, poin ditukar, dan saldo setelah transaksi. Snapshot dipakai untuk struk/cetak ulang dan sinkronisasi Android. Retry/webhook tidak boleh menambah poin dua kali. Retur membalik perubahan poin satu kali. Transaksi lama tanpa snapshot tidak direkonstruksi menggunakan aturan poin saat ini.
- Email owner bertitik diterima tanpa membuang titik atau bagian `+...`. Pendaftaran dan sesi pertama berada dalam satu transaksi database. Timeout, konfigurasi login tidak lengkap, dan schema yang belum sesuai mendapatkan pesan/kode error yang lebih jelas. Benturan username dibedakan dari email terdaftar.
- Android diarahkan ke backend KasirPOS baru: `https://kasirpos-api.vercel.app`.
- Dark mode web: kartu Pengaturan memakai permukaan gelap dengan label/form yang terbaca; badge, grafik, dan bayangan tombol mengikuti palet gelap. Menu pintas dashboard tersusun 2×2 pada tablet dan empat kolom pada desktop lebar. Tema perangkat diterapkan juga ketika kasir dibuka langsung, setelah reload, serta saat preferensi berubah di tab lain. Kertas preview/cetak struk tetap putih dengan teks hitam, termasuk cetak ulang dari riwayat.

### Pemeriksaan tambahan dark mode

- Build static export frontend berhasil untuk 26 halaman; 3 tes frontend lulus.
- Browser fixture lokal diperiksa pada lebar 390, 944, dan 1280 piksel: formulir Pengaturan, dashboard/grafik, mode terang, kasir setelah reload, pembayaran, dan preview struk. Tidak ada error console pada sesi pemeriksaan akhir.
- Seluruh transaksi pemeriksaan tampilan memakai fixture dalam memori lokal; database produksi tidak diubah. Perbaikan tema ini belum di-commit atau di-push. Setelah commit, push ke repo KasirPOS dan tunggu deployment Cloudflare Pages berhasil, lalu hard refresh.

## Database

Migrasi baru: `pos-be/prisma/migrations/202610180001_transaction_loyalty_snapshot/migration.sql`.

Empat kolom ditambahkan pada tabel `transactions`: `points_earned`, `points_redeemed`, `points_balance_after`, dan `loyalty_reversed`. Ketiga angka boleh NULL agar transaksi historis tanpa snapshot tidak dianggap memiliki catatan poin yang lengkap.

Migrasi sudah diterapkan pada database **kasirpos** yang baru. Jumlah transaksi tetap **4 sebelum dan sesudah migrasi**. Riwayat migrasi asal dipertahankan. Tidak perlu menjalankan ulang SQL ini pada database tersebut.

Untuk database KasirPOS lain yang belum memiliki empat kolom tersebut, jalankan migrasi menggunakan akun pengelola database sebelum menerbitkan backend baru. Akun runtime tetap cukup memiliki hak SELECT, INSERT, UPDATE, DELETE. Jangan memakai `migrate reset` atau `db push --accept-data-loss`. Database yang dahulu dibuat memakai `db push` perlu penanganan baseline sebelum menggunakan seluruh `migrate deploy`; jangan menjalankan semua migrasi lama secara membabi buta.

## Hasil pemeriksaan

- Backend: 49 tes lulus.
- Frontend: 3 tes regresi lulus; perhitungan tagihan dibandingkan dengan server dan rincian ekspor laporan diperiksa.
- Android: TypeScript lulus; 5 suite / 13 tes lulus.
- Prisma schema valid.
- Static export web lulus, 26 halaman. Script `npm run build` memakai Webpack karena build Turbopack lokal Windows berhenti tanpa diagnostik. Versi dependensi tetap mengikuti lockfile.
- Uji controller checkout dengan TiDB nyata: diskon 10% pada Rp1.000.000 menjadi Rp900.000; member mendapat 90 poin; retry tidak menggandakan transaksi/poin; retur mengembalikan perubahan poin sekali; snapshot saldo tidak berubah saat retur.
- API riwayat sinkronisasi mengirim snapshot poin dan diskon yang sama untuk Android.
- Uji controller pendaftaran dengan TiDB nyata: email bertitik, pembuatan usaha, trial, membership, dan sesi login pertama berhasil sebelum transaksi uji di-rollback.
- Kedua uji database memakai transaksi yang sengaja di-rollback. Tidak ada akun uji permanen yang tertinggal.
- Browser dengan data fixture lokal: navigasi tanpa simpan, pilihan tetap di sini, buang perubahan, simpan lalu lanjutkan, gagal simpan tetap di halaman, tombol simpan pada mobile setelah scroll, rincian Gaji Rp2.500.000, diskon, pembayaran, dan poin di struk berhasil diperiksa.

Error pendaftaran pada deployment lama belum dapat direproduksi dengan pasti; screenshot menunjukkan error server, bukan penolakan format email. Tidak diperlukan upgrade Vercel untuk melanjutkan. Setelah deployment baru, coba pendaftaran kembali dan gunakan kode error yang tampil bila masih gagal.

APK baru belum dibangun atau diuji pada perangkat. Poin pada transaksi historis tanpa snapshot tidak diisi ulang. Pengujian gateway Midtrans langsung bukan bagian dari uji transaksi manual ini.

## Commit, push, dan deployment

Perubahan belum di-commit atau di-push oleh asisten. Dari root proyek:

```bash
git add -A
git diff --cached --name-only
git commit -m "fix: improve KasirPOS checkout settings loyalty and registration"
git push origin HEAD:main
```

Periksa daftar staged. `.env`, `key*.txt`, `.demo-runtime`, `keystore.properties`, kunci privat, dan `generator.html` tetap diabaikan Git. SQL migrasi baru memang harus ikut commit. Tujuan push adalah **abrahamyada24/webandroid-pos**, bukan repo LitePOS asal.

Commit hanya menyimpan perubahan lokal. Push ke `main` memicu deployment baru pada project Vercel dan Cloudflare Pages yang terhubung. Tunggu kedua deployment Ready/Success, lalu hard refresh browser. Jika deployment otomatis tidak berjalan, lakukan Redeploy pada project KasirPOS terkait.

Setelah deploy, cek `/api/health`, daftar usaha, login, diskon, transaksi member, struk, dan laporan. Android memerlukan build/install APK baru; perubahan Git tidak memperbarui APK yang sudah terpasang.

## User dan password super admin

Buka **Vercel → kasirpos-api → Settings → Environment Variables**. Untuk environment Production, isi atau perbarui:

| Nama | Isi |
| --- | --- |
| `PLATFORM_ADMIN_NAME` | Nama pengelola platform |
| `PLATFORM_ADMIN_EMAIL` | Email login super admin |
| `PLATFORM_ADMIN_PASSWORD` | Password baru yang kuat, minimal 12 karakter, maksimal 72 byte |
| `PLATFORM_ADMIN_JWT_SECRET` | Secret acak panjang yang berbeda dari `JWT_SECRET`; pertahankan secret yang sudah ada |

Simpan, lalu Redeploy backend agar nilai baru digunakan. Login lewat **`/super-admin/login/` pada website KasirPOS**. Akun super admin terpisah dari Owner usaha dan halaman login kasir biasa.

Pada pemeriksaan database tanggal ini, akun super admin **belum dibuat**. Akun pertama dibuat pada login pertama yang cocok dengan environment di atas. Setelah akun pernah dibuat, mengganti environment tidak menimpa password di database; pemulihan akun membutuhkan langkah reset yang terarah.

Konfigurasi lokal berada di `pos-be/.env`. Catatan akun awal sebelumnya disimpan secara privat dalam `.demo-runtime/kasirpos/akun-superadmin.txt`; file ini tidak ikut Git. Password dimasukkan pada dashboard Vercel atau file lokal tersebut, bukan pada source code atau `.env.example`. Jangan mengirim password lewat chat atau screenshot.
