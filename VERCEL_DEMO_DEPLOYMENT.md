# Deployment demo LitePOS: Cloudflare Pages + Vercel + TiDB

Arsitektur demo permanen tanpa VPS:

```text
Browser
  -> Cloudflare Pages + Pages Functions
  -> Vercel Hobby (Express API)
  -> TiDB Cloud Starter (MySQL)
  -> Cloudinary (upload gambar)
```

Cloudflare tetap menjadi origin frontend sehingga cookie autentikasi tetap first-party. `API_PROXY_TARGET` pada Pages Functions diarahkan ke domain backend Vercel.

## 1. Batasan demo

- Vercel Hobby ditujukan untuk project personal/nonkomersial dan dapat berhenti sementara bila kuota gratis habis.
- Vercel Hobby tidak menyediakan outbound IP statis. TiDB perlu mengizinkan koneksi dari internet untuk database demo.
- Gunakan user database khusus dengan hak hanya pada database `litepos_demo`; jangan memakai `root` pada Vercel.
- Pertahankan TLS dengan `?sslaccept=strict`.
- Jangan aktifkan Midtrans production. Data seed dan pembayaran demo tetap dummy.
- Untuk penggunaan bisnis nyata, pindahkan API ke VPS/static IP lalu batasi firewall TiDB.

## 2. Buat user TiDB khusus aplikasi

Buat password heksadesimal yang aman dari Git Bash:

```bash
openssl rand -hex 24
```

Buka SQL Editor TiDB sebagai user administrasi. Pada TiDB Cloud Starter, username tambahan wajib memakai prefix yang sama dengan user koneksi bawaan. Jika username koneksi Anda berbentuk `PREFIX.root`, gunakan `PREFIX.litepos_demo_app` di bawah. Ganti `PREFIX` dan nilai password:

```sql
CREATE USER IF NOT EXISTS 'PREFIX.litepos_demo_app'@'%' IDENTIFIED BY 'PASSWORD_HEX_DARI_OPENSSL';
GRANT SELECT, INSERT, UPDATE, DELETE ON litepos_demo.* TO 'PREFIX.litepos_demo_app'@'%';
SHOW GRANTS FOR 'PREFIX.litepos_demo_app'@'%';
```

Simpan password di password manager. Jangan menaruhnya dalam file repository atau screenshot.

Pada pengaturan Networking/Security TiDB, tambahkan `0.0.0.0/0` agar Vercel dengan IP dinamis dapat tersambung. Ini hanya layak untuk database demo dengan password kuat dan user terbatas di atas.

URL Vercel menggunakan format:

```text
mysql://PREFIX.litepos_demo_app:PASSWORD_HEX@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/litepos_demo?sslaccept=strict
```

## 3. Push persiapan Vercel ke repo demo

Dari root project:

```bash
git add pos-be/package.json pos-be/package-lock.json pos-be/src/app.js pos-be/src/config/prisma.js VERCEL_DEMO_DEPLOYMENT.md
git commit -m "feat: prepare Express API for Vercel"
git push demo HEAD:main
```

Periksa daftar file sebelum commit dengan `git status --short`. Jangan menambahkan `pos-be/.env`, `key.txt`, file log, atau dump database.

## 4. Buat project backend di Vercel

1. Login ke Vercel dengan GitHub.
2. Pilih **Add New > Project**.
3. Import repository `abrahamyada24/litepos-demo`.
4. Isi nama project, misalnya `litepos-demo-api`.
5. Set **Root Directory** ke `pos-be`.
6. Biarkan framework terdeteksi sebagai Express/Other.
7. Jangan isi Output Directory.
8. Tambahkan environment variables sebelum deploy.

Environment wajib:

```text
NODE_ENV=production
DATABASE_URL=mysql://PREFIX.litepos_demo_app:PASSWORD_HEX@HOST_TIDB:4000/litepos_demo?sslaccept=strict
JWT_SECRET=<secret panjang yang sama dengan konfigurasi demo>
LICENSE_CODE_SECRET=<secret panjang terpisah>
CORS_ORIGINS=https://litepos-demo.pages.dev,https://*.pages.dev
CLOUDINARY_CLOUD_NAME=<cloud name>
CLOUDINARY_API_KEY=<API key>
CLOUDINARY_API_SECRET=<API secret>
ENABLE_API_DOCS=false
MIDTRANS_IS_PRODUCTION=false
```

Tidak perlu memasukkan `SEED_*` karena database sudah di-seed. Jangan isi `MIDTRANS_SERVER_KEY` atau `MIDTRANS_CLIENT_KEY` untuk demo ini.

Pilih environment **Production**, **Preview**, dan **Development** bila Vercel menawarkan scope. Setelah itu klik **Deploy**.

## 5. Verifikasi backend Vercel

Setelah deployment sukses, buka:

```text
https://NAMA-PROJECT.vercel.app/api/health
```

Hasil yang benar:

```json
{"database":"CONNECTED","server":"ONLINE"}
```

Jika muncul `P1001`, periksa allowlist TiDB, hostname, port `4000`, dan `sslaccept=strict`. Jika muncul error autentikasi database, periksa user `litepos_demo_app` dan password tanpa menampilkan nilainya di screenshot.

## 6. Hubungkan Cloudflare Pages ke Vercel

Pada project Pages `litepos-demo` buka **Settings > Variables and secrets** dan ubah:

```text
API_PROXY_TARGET=https://NAMA-PROJECT.vercel.app
NEXT_PUBLIC_API_URL=https://litepos-demo.pages.dev
STATIC_EXPORT=true
NODE_VERSION=22
```

Simpan lalu picu deployment Pages baru. Git push kosong dapat digunakan bila dashboard tidak menyediakan tombol deployment baru:

```bash
git commit --allow-empty -m "chore: connect Pages to Vercel API"
git push demo HEAD:main
```

Setelah Pages selesai, uji:

```text
https://litepos-demo.pages.dev/api/health
https://litepos-demo.pages.dev/login/
```

Login dengan `owner-demo`, `admin-demo`, atau `kasir-demo` dan password seed masing-masing. Uji perpindahan **Laundry Ceria** dan **Toko Pakaian Warna Warni**, transaksi dummy, stok, laporan, serta upload gambar Cloudinary.

## 7. Matikan jalur Quick Tunnel

Setelah health check dan login melalui Vercel berhasil, terminal backend serta `cloudflared` lokal dapat ditutup. Launcher Quick Tunnel tidak diperlukan untuk deployment utama. Cloudflare Pages, Vercel, TiDB, dan Cloudinary akan tetap aktif tanpa laptop.

## 8. Saat beralih ke VPS

1. Deploy folder `pos-be` ke VPS Node.js.
2. Pertahankan environment variables dan database TiDB atau migrasikan database secara terencana.
3. Batasi allowlist TiDB ke IP statis VPS dan hapus aturan `0.0.0.0/0`.
4. Ubah `API_PROXY_TARGET` Cloudflare Pages ke domain API VPS.
5. Jalankan health check, login, isolasi antar-usaha, transaksi, dan upload sebelum mengalihkan demo/pengguna.
