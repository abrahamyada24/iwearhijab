# Panduan KasirPOS: GitHub, TiDB, Vercel, Cloudflare Pages, dan Android

KasirPOS menggunakan kode dan fitur aplikasi asal dengan nama baru, tampilan teks tanpa logo bawaan, serta ikon aplikasi huruf **K**. Logo toko yang diunggah pengguna tetap didukung. Semua layanan KasirPOS dibuat terpisah dari LitePOS Demo.

**Mulai dari langkah 1.** Website/API/APK belum terhubung ke hosting baru. Domain `.example` adalah placeholder yang sengaja tidak aktif, bukan alamat layanan yang sudah dibuat.

## 1. Repository baru

Repository tujuan: `https://github.com/abrahamyada24/webandroid-pos.git`.

Di folder proyek ini, `origin` diarahkan ke repository baru. Remote `demo` tetap bisa dibaca, tetapi alamat push-nya dinonaktifkan. Periksa sebelum mengunggah:

```powershell
git remote -v
git status --short
```

Jangan mengunggah `.env`, `key*.txt`, `.demo-runtime`, `keystore.properties`, keystore privat, atau `generator.html`. File-file lokal tersebut diabaikan Git. Riwayat migrasi database asal dipertahankan.

Jika perubahan belum di-commit, pilih file kode/dokumentasi yang ingin disimpan, lalu commit. Push perubahan hanya ke **origin**, bukan remote demo. Jika repository baru masih kosong dan ingin memakai `main`:

```powershell
git push -u origin HEAD:main
```

Perintah di atas ditujukan khusus untuk repository baru; tidak memakai `--force`.

## 2. Tentukan project hosting baru

Gunakan akun layanan yang kamu miliki, lalu buat **project baru**. Contoh nama (ketersediaannya perlu diperiksa):

| Layanan | Contoh nama | Folder sumber |
| --- | --- | --- |
| Cloudflare Pages | `kasirpos-web` | `pos-fe` |
| Vercel | `kasirpos-api` | `pos-be` |
| TiDB Cloud | cluster KasirPOS, database `kasirpos` | skema Prisma backend |
| Cloudinary | akun/cloud baru, atau folder terpisah `kasirpos` | upload produk/logo toko |

Catat domain frontend yang benar dari Cloudflare untuk diisi ke `CORS_ORIGINS` Vercel. Jangan mengedit project Pages, Vercel, database, atau environment milik demo lama.

## 3. Buat database TiDB baru

1. Buat cluster TiDB Cloud baru. Pilih region Singapore bila tersedia agar dekat dengan API Vercel `sin1`.
2. Buka SQL Editor cluster **baru**, lalu buat database `kasirpos`.
3. Salin informasi koneksi MySQL: host, port, username, password, dan kebutuhan TLS.
4. Untuk menjalankan skema pertama, gunakan akun pengelola cluster baru. Untuk runtime aplikasi, buat user khusus yang hanya boleh membaca/menulis database KasirPOS.

Contoh SQL; ganti `PREFIX` sesuai prefix username dari TiDB dan gunakan password baru yang kuat:

```sql
CREATE DATABASE kasirpos;
CREATE USER 'PREFIX.kasirpos_app'@'%' IDENTIFIED BY 'GANTI_PASSWORD_BARU';
GRANT SELECT, INSERT, UPDATE, DELETE ON kasirpos.* TO 'PREFIX.kasirpos_app'@'%';
```

Konfigurasi network access sesuai petunjuk koneksi TiDB. Vercel tanpa outbound IP tetap mungkin memerlukan akses internet `0.0.0.0/0`; gunakan TLS, password kuat, dan user runtime terbatas di atas. Untuk akses jaringan yang lebih ketat, gunakan fasilitas IP tetap yang sesuai paket hosting.

### Membuat tabel pertama kali

Pada PowerShell di folder proyek:

```powershell
npm run setup:local
cd pos-be
npm ci --include=dev
```

Edit `pos-be/.env`, isi `DATABASE_URL` memakai akun pengelola **database baru** untuk pembuatan tabel. Format:

```dotenv
DATABASE_URL="mysql://USERNAME:PASSWORD@HOST:4000/kasirpos?sslaccept=strict&connection_limit=3"
```

URL-encode username/password jika mengandung karakter khusus seperti `@`, `#`, `?`, `/`, dan `:`. Gunakan opsi TLS/CA sesuai connection string resmi TiDB; jangan menonaktifkan verifikasi sertifikat.

Pastikan nama database benar-benar `kasirpos`, kemudian jalankan:

```powershell
npm run db:deploy
npx prisma validate
```

`db:deploy` pada proyek ini menjalankan `prisma db push`. Gunakan untuk **database KasirPOS yang baru dan kosong**. Tidak ada flag penghapusan data. Jangan menjalankan `reset-db.js`, `migrate reset`, atau `--accept-data-loss` pada database lama.

Setelah tabel terbentuk, ubah `DATABASE_URL` lokal dan Vercel ke user runtime `PREFIX.kasirpos_app`. Akun pengelola tidak perlu disimpan di Vercel. Tidak perlu seed untuk mendaftarkan usaha baru lewat website.

Jika ingin data contoh seperti versi asal, isi `SEED_OWNER_PASSWORD`, `SEED_ADMIN_PASSWORD`, `SEED_CASHIER_PASSWORD` dari `.env.example`, lalu jalankan `npm run seed` hanya pada database KasirPOS. Nama pengguna contoh: `owner-demo`, `admin-demo`, `kasir-demo`.

## 4. Siapkan penyimpanan gambar

Siapkan cloud Cloudinary dan simpan `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, serta `CLOUDINARY_API_SECRET` untuk Vercel. Gunakan cloud baru jika ingin pemisahan akun sepenuhnya; kode juga memakai folder `kasirpos/store-...` yang terpisah dari demo lama.

**Ketiga nilai Cloudinary wajib diisi pada Vercel** agar upload tidak mencoba menyimpan file ke disk lokal Function. TiDB menyimpan data/URL gambar, sedangkan file gambar disimpan di Cloudinary.

## 5. Deploy backend ke Vercel

1. Pilih **Add New Project**, import `abrahamyada24/webandroid-pos`.
2. Gunakan project baru; Root Directory: **`pos-be`**.
3. Production Branch: **`main`** bila langkah 1 memakai `HEAD:main`.
4. Install Command: **`npm ci --include=dev`**.
5. Build Command: **`npm run build`**. Output Directory tidak perlu diisi.
6. Runtime Node.js: **22.x**. `vercel.json` mengatur region runtime `sin1`.
7. Isi environment Production berikut, lalu deploy:

| Variable | Isi |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | user runtime khusus database KasirPOS, TLS aktif |
| `JWT_SECRET` | secret acak baru |
| `LICENSE_CODE_SECRET` | secret acak baru yang berbeda |
| `CORS_ORIGINS` | domain HTTPS Cloudflare Pages KasirPOS yang sebenarnya, tanpa slash akhir |
| `CLOUDINARY_CLOUD_NAME` | cloud gambar KasirPOS |
| `CLOUDINARY_API_KEY` | API key Cloudinary |
| `CLOUDINARY_API_SECRET` | API secret Cloudinary |
| `CLOUDINARY_FOLDER` | `kasirpos` |
| `PLATFORM_ADMIN_NAME` | nama pengelola KasirPOS |
| `PLATFORM_ADMIN_EMAIL` | email pengelola |
| `PLATFORM_ADMIN_PASSWORD` | password baru minimal 12 karakter |
| `PLATFORM_ADMIN_JWT_SECRET` | secret acak baru yang berbeda |
| `MIDTRANS_IS_PRODUCTION` | `false` untuk pengujian |
| `ENABLE_API_DOCS` | `false` |

Midtrans server/client key bisa dikosongkan untuk pembayaran manual. `UPLOAD_DIR` tidak perlu diisi. Akun Super Admin pertama dibuat saat login pertama ketika tabel admin masih kosong.

Buat setiap secret secara terpisah, misalnya pada terminal lokal:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Simpan nilainya di pengelola password/environment layanan. Jangan memakai ulang secret demo lama.

Email OTP bersifat opsional. Jika dipakai, isi `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, dan `SMTP_FROM`, misalnya `"KasirPOS" <noreply@domainmu>`. Pengirim email lama sudah dihapus dari kode.

Setelah deploy, buka **domain API yang diberikan Vercel** ditambah `/api/health`. Hasil yang diharapkan:

```json
{"database":"CONNECTED","server":"ONLINE"}
```

Jika belum terhubung, periksa network access TiDB, TLS, username/password, database, dan region. Deploy ulang setelah mengubah environment. Jangan lanjut membagikan aplikasi sebelum health check berhasil.

Vercel Hobby ditujukan untuk penggunaan personal/nonkomersial. Untuk operasional bisnis gunakan paket yang sesuai ketentuan Vercel.

## 6. Deploy frontend ke Cloudflare Pages

Import repository **`abrahamyada24/webandroid-pos`** sebagai project Pages baru:

| Pengaturan | Nilai |
| --- | --- |
| Production branch | `main` |
| Root directory | `pos-fe` |
| Framework | Next.js Static HTML Export / konfigurasi manual |
| Build command | `npm run build` |
| Build output directory | `out` |
| `NODE_VERSION` | `22` |
| `STATIC_EXPORT` | `true` |
| `API_PROXY_TARGET` | origin HTTPS Vercel KasirPOS, tanpa `/api` |
| `NEXT_PUBLIC_API_URL` | **tidak perlu diisi**; hapus variable bila berisi domain lama |

`API_PROXY_TARGET` harus tersedia untuk **Pages Functions**, bukan hanya proses build. Folder `pos-fe/functions` menangani `/api/*` dan `/uploads/*`. Gunakan Git integration agar Functions ikut diterbitkan; jangan hanya mengunggah folder `out` lewat drag-and-drop dashboard.

Browser memakai `/api` pada domain Pages sendiri. Pages Functions meneruskannya ke Vercel; cookie login tetap memakai domain website yang sama. `CF_PAGES=1` juga otomatis mengaktifkan static export.

Jika memakai Preview, isi environment Preview dengan konfigurasi KasirPOS yang sesuai. Tambahkan hanya origin Preview milik project sendiri ke `CORS_ORIGINS` backend jika diperlukan.

Sesudah deploy, buka domain Pages KasirPOS ditambah `/api/health`, `/login/`, dan `/register/`. Pastikan domain tersebut juga tercantum dalam `CORS_ORIGINS` Vercel. Tambahkan custom domain nanti setelah alur utama berhasil.

## 7. Daftar dan uji usaha pertama

1. Buka `/register/` pada domain KasirPOS. Buat usaha dan akun Owner baru.
2. Login, periksa Pengaturan, lalu buat kategori dan produk contoh.
3. Coba upload gambar produk serta logo toko.
4. Buka shift, lakukan transaksi dummy, lalu periksa struk, stok, laporan, dan penutupan shift.
5. Buat akun pegawai dan periksa batas perannya.
6. Buat usaha kedua dan pastikan data kedua usaha terpisah.
7. Uji `/super-admin/login/`, lisensi, serta logout/login ulang.

Masa trial dan aturan lisensi mengikuti versi asal. Mengganti branding tidak menghapus aturan tersebut. Akun LitePOS Demo tidak otomatis menjadi akun KasirPOS karena databasenya berbeda.

## 8. Hubungkan dan build Android KasirPOS

Edit **`pos-android/src/config/deployment.ts`**. Ganti `https://api.kasirpos.example` dengan origin API Vercel KasirPOS yang sudah lolos health check. Tanpa `/api` atau slash akhir. Contoh format:

```typescript
export const KASIRPOS_API_ORIGIN = 'https://DOMAIN-API-BARU.vercel.app';
```

Android sengaja tetap mengunci koneksi ke origin build, mengikuti perilaku aplikasi asal. Mengubah URL tersimpan di perangkat tidak akan mengalihkan APK ke server lain.

Dari root proyek:

```powershell
npm run check:branding
npm run check:deployment
cd pos-android
npm ci
npm test -- --runInBand
npx tsc --noEmit
```

Identitas aplikasi: **`com.kasirpos.app`**, nama launcher: **KasirPOS**. Aplikasi bisa dipasang berdampingan dengan LitePOS Demo. Ikon K ada di semua density Android. Untuk membuat ulang ikon:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/generate-kasirpos-icons.ps1
```

### Kunci rilis baru

Gunakan JDK dari Android Studio atau JDK yang sesuai dengan versi Android Gradle Plugin proyek. Pada komputer ini, konfigurasi menunjuk ke `C:/Program Files/Android/Android Studio/jbr`; sesuaikan `org.gradle.java.home` di `android/gradle.properties` bila lokasi instalasi berbeda.

Jangan memakai ulang file konfigurasi signing lama. Pada folder kerja ini salinannya sudah disimpan di `.demo-runtime/original-android-keystore.properties`. Buat keystore KasirPOS baru dari `pos-android/android/app`:

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore kasirpos-release.keystore -alias kasirpos -keyalg RSA -keysize 2048 -validity 10000
```

Isi password melalui prompt. Salin `android/keystore.properties.example` menjadi `android/keystore.properties`, lalu isi password dan alias KasirPOS yang benar. `storeFile=kasirpos-release.keystore` relatif ke folder `android/app`. Simpan backup keystore/password; pembaruan KasirPOS berikutnya memakai kunci dan application ID yang sama.

Dari `pos-android/android`:

```powershell
.\gradlew.bat :app:assembleRelease --console=plain
```

APK: `pos-android/android/app/build/outputs/apk/release/app-release.apk`. Install pada perangkat uji, login dengan akun KasirPOS, lalu uji transaksi, cetak Bluetooth/USB, barcode, unggah, dan logout. Distribusikan setelah pengujian perangkat selesai.

Jika Gradle gagal dengan `PKIX path building failed`, perbaiki trust certificate JDK/proxy jaringan atau gunakan jaringan tepercaya. Jangan mematikan verifikasi TLS. Bundle JS dan tes yang lulus tidak menggantikan build APK dan pengujian perangkat.

## 9. Menjalankan lokal dan hasil pemeriksaan

Port KasirPOS dipisahkan: website `http://localhost:3100`, backend `http://127.0.0.1:5100`. Isi `.env` database KasirPOS terlebih dahulu. Jalankan `npm run dev` masing-masing dari `pos-be` dan `pos-fe` di terminal berbeda.

`npm run setup:local` dijalankan dari root. Pada pemakaian pertama, script menyimpan cadangan `.env` yang ada ke `.demo-runtime/original-env-...`, lalu membuat konfigurasi lokal tanpa koneksi lama. Pemakaian ulang tidak menimpa environment yang sudah disiapkan. Folder backup tidak diunggah ke Git.

Pemeriksaan kode saat perubahan branding: build static website, tes backend, tes Android, pemeriksaan TypeScript, pemeriksaan branding, dan bundle Android. Status APK native serta verifikasi database/deployment yang benar-benar berhasil dicatat pada laporan hasil pengerjaan; jangan menganggap hosting baru sudah aktif hanya karena build kode berhasil.

## Referensi resmi

- [Cloudflare Pages: Next.js static export](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/)
- [Vercel: Express](https://vercel.com/docs/frameworks/backend/express)
- [Vercel: Hobby](https://vercel.com/docs/plans/hobby)
- [TiDB: Prisma](https://docs.pingcap.com/developer/dev-guide-sample-application-nodejs-prisma/)

Dokumen deployment lain yang ditandai **ARSIP** menyebut layanan lama. Gunakan panduan ini untuk KasirPOS.
