# Deployment Iwearing Hijab

Target: Cloudflare Pages untuk frontend, Vercel untuk backend Express, TiDB Cloud untuk database MySQL, dan Cloudinary untuk gambar. Seluruh nama domain di bawah adalah placeholder; layanan belum dibuat atau di-deploy oleh Codex.

```text
Browser → Cloudflare Pages
            /api/* → Pages Functions → Vercel Express → TiDB (TLS)
                                           └ upload gambar → Cloudinary
Browser ← URL gambar HTTPS Cloudinary
```

## 1. TiDB dan inisialisasi toko

Buat database `iwear` khusus proyek ini. Ambil koneksi dari panel Connect TiDB, kemudian isi `DATABASE_URL` pada `pos-be/.env` lokal dan environment backend Vercel:

```dotenv
DATABASE_URL="mysql://USER:PASSWORD@HOST:4000/iwear?sslaccept=strict&connection_limit=1&pool_timeout=20"
```

URL-encode username/password bila mengandung karakter khusus. Gunakan TLS strict dan pengaturan akses jaringan TiDB yang mengizinkan koneksi backend Vercel. Jangan memakai database toko lain.

Pada **database baru kosong**, isi juga `SEED_OWNER_EMAIL` dan `SEED_OWNER_PASSWORD` (minimal 12 karakter), kemudian jalankan dari `pos-be`:

```powershell
npm ci
npm run prisma:generate
npm run prisma:push
npm run seed
```

Ini membuat satu toko Iwearing dan akun pemilik ber-username `admin`, tanpa transaksi/produk contoh. Password wajib diganti saat login pertama. Trial lisensi upstream tetap berlaku. Jangan menjalankan seed otomatis pada setiap build Vercel. Untuk database yang sudah berisi data, tinjau migrasi dan backup sebelum perubahan schema.

## 2. Cloudinary

Gunakan environment/product Cloudinary khusus toko atau folder `iwear`. Ambil cloud name, API key, dan API secret. Ketiganya hanya diisi pada backend Vercel; upload menggunakan SDK backend yang sudah tersedia. Tidak perlu unsigned upload preset.

```dotenv
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_API_KEY
CLOUDINARY_API_SECRET=YOUR_API_SECRET
CLOUDINARY_FOLDER=iwear
```

Gambar disimpan di `iwear/store-ID`. URL HTTPS hasil upload disimpan pada TiDB; file gambar ada di Cloudinary. Login memakai logo statis yang sudah masuk repository. Upload aplikasi dibatasi 2 MB per gambar. Jangan mengandalkan folder upload lokal Vercel untuk penyimpanan permanen.

## 3. Backend Vercel

Import repository GitHub `abrahamyada24/iwearhijab` sebagai project backend tersendiri:

| Pengaturan | Nilai |
| --- | --- |
| Root directory | `pos-be` |
| Framework | Express (auto-detect) |
| Node.js | `22.x` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | Biarkan default, jangan isi `out` |

`src/app.js` mengekspor instance Express. `vercel.json` memilih region `sin1` dan Fluid compute. Build hanya generate Prisma Client, tidak mengubah schema/data database.

Isi environment berikut dari `pos-be/.env.example`:

| Variable | Nilai |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Koneksi TiDB di langkah 1 |
| `JWT_SECRET` | Secret acak kuat |
| `LICENSE_CODE_SECRET` | Secret acak berbeda |
| `PLATFORM_ADMIN_JWT_SECRET` | Secret acak berbeda |
| `CORS_ORIGINS` | Origin frontend persis, misalnya `https://YOUR_PROJECT.pages.dev` |
| `PUBLIC_BUSINESS_REGISTRATION` | `false` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Kredensial langkah 2 |
| `CLOUDINARY_FOLDER` | `iwear` |
| `ENABLE_API_DOCS` | `false` |

Untuk panel super admin, isi `PLATFORM_ADMIN_NAME`, `PLATFORM_ADMIN_EMAIL`, dan `PLATFORM_ADMIN_PASSWORD` (minimal 12 karakter). Akun pemilik toko berbeda dari super admin. Payment gateway dan SMTP opsional, biarkan kosong bila belum dipakai. Kredensial seed cukup dipakai saat inisialisasi lokal dan tidak perlu disimpan pada build frontend.

Deploy backend, lalu cek `https://YOUR_BACKEND.vercel.app/api/health`. Respons harus `server: ONLINE` dan `database: CONNECTED`. Bila Vercel Deployment Protection aktif, Pages Functions tidak dapat memanggil endpoint tersebut tanpa konfigurasi akses yang sesuai; pastikan endpoint produksi dapat dipakai aplikasi sebelum menguji frontend.

## 4. Frontend Cloudflare Pages

Hubungkan repository yang sama melalui **Pages Git integration**:

| Pengaturan | Nilai |
| --- | --- |
| Production branch | `main` |
| Root directory | `pos-fe` |
| Framework preset | Next.js (Static HTML Export), atau None dengan pengaturan di bawah |
| Build command | `npm run build` |
| Build output directory | `out` |
| `NODE_VERSION` | `22` |
| `STATIC_EXPORT` | `true` |
| `NEXT_PUBLIC_API_URL` | Kosong / tidak dibuat |

Isi variable runtime **Pages Functions** `API_PROXY_TARGET=https://YOUR_BACKEND.vercel.app`, tanpa `/api`. Isi untuk Production dan untuk Preview hanya jika ingin preview terhubung backend tersebut. Tambahkan domain frontend final ke `CORS_ORIGINS` backend lalu redeploy backend.

`wrangler.jsonc` mencatat nama project yang diusulkan (`iwearhijab`), output `out`, dan compatibility date. Sesuaikan nama itu bila project Pages memakai nama lain. Folder `functions` harus tetap berada di `pos-fe/functions`, sejajar dengan `package.json`; bukan dipindahkan ke `out`. Gunakan Git integration agar Pages Functions ikut ter-deploy. Jangan hanya mengunggah folder `out` lewat dashboard drag-and-drop.

Browser memanggil `/api` pada origin Cloudflare sendiri. Pages Functions meneruskan request dan cookie ke Vercel, termasuk respons Set-Cookie. Pertahankan `NEXT_PUBLIC_API_URL` kosong agar sesi cookie tetap first-party. `_routes.json` membatasi Functions pada `/api/*` dan `/uploads/*`; halaman/aset statis dilayani Pages. CSP frontend sudah mengizinkan gambar `https://res.cloudinary.com`.

## 5. Pemeriksaan setelah deploy

1. Cek `/api/health` melalui domain backend dan melalui domain Cloudflare.
2. Buka `/login`, login pemilik, lalu ganti password awal.
3. Tambahkan satu produk uji dan unggah gambar; pastikan URL berasal dari Cloudinary dan tetap tampil setelah reload.
4. Uji transaksi, member/poin, stok, shift, laporan, dan logout pada database toko.
5. Isi domain backend nyata pada konfigurasi Android sebelum build APK, lalu jalankan `npm run check:deployment`.

Catatan hasil pengujian lokal dan temuan dependency ada di [HASIL_PENGUJIAN_IWEAR.md](HASIL_PENGUJIAN_IWEAR.md). Hosting belum diverifikasi sampai environment dan layanan sebenarnya tersedia.

## Referensi resmi

- [Cloudflare: build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Cloudflare: Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/)
- [Vercel: Express](https://vercel.com/docs/frameworks/backend/express)
- [TiDB: Prisma quickstart](https://github.com/tidb-samples/tidb-nodejs-prisma-quickstart)
- [Cloudinary: Node.js SDK](https://cloudinary.com/documentation/node_integration)
