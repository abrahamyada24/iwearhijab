# LitePOS Demo: Deployment dan Multi-Usaha

## Keputusan arsitektur

Project ini bukan aplikasi React statis murni. Frontend memakai Next.js/React, sedangkan API memakai Express, Prisma, dan MySQL. Karena itu jalur Cloudflare yang paling kecil risikonya adalah:

- Cloudflare Pages (free): hasil static export frontend.
- Cloudflare Pages Functions (free): proxy same-origin untuk `/api/*` dan `/uploads/*`, agar cookie sesi tetap first-party.
- Render Web Service (free): menjalankan Express/Prisma tanpa rewrite backend.
- TiDB Cloud Starter: database MySQL-compatible untuk Prisma.
- Cloudinary free: penyimpanan upload karena filesystem Render free tidak persisten.

Batas free tier yang perlu diterima untuk demo: Render tidur setelah 15 menit tanpa traffic dan cold start dapat mendekati satu menit; Pages Functions berbagi kuota Workers Free; TiDB Starter akan throttle ketika kuota gratis habis; Cloudinary memakai kuota kredit bulanan. Karena itu arsitektur ini cocok untuk demo, bukan SLA produksi.

Cloudflare Workers + D1 **tidak** dipakai untuk backend. D1 memakai SQLite, sedangkan schema dan migration project ini memakai MySQL/Prisma; Express, Prisma MySQL, webhook Midtrans, dan upload middleware juga perlu adaptasi runtime Worker. Memaksakan D1 berarti rewrite besar dan berisiko merusak fitur.

Tidak ada proses deploy, pembuatan repo, push, atau perubahan GitHub yang dilakukan oleh pekerjaan ini.

## Ringkasan audit

| Area | Kondisi | Penanganan |
| --- | --- | --- |
| Frontend | Next.js 16 + React 19 | Static export opsional melalui `STATIC_EXPORT=true`; Pages headers dan Functions proxy disiapkan. |
| API | Express/Node | Tetap dipertahankan; cocok di Render tanpa perubahan arsitektur. |
| Database/ORM | Prisma + MySQL | Tetap MySQL-compatible; TiDB Starter direkomendasikan. |
| Autentikasi | JWT dalam HttpOnly cookie + tabel sesi | Dipertahankan; sesi kini menyimpan `activeStoreId` dan setiap request memvalidasi membership. |
| Tenant lama | Tidak ada tenant; `StoreSetting`/`StoreLicense` adalah singleton outlet | Ditambah model `Store`; data lama dibackfill ke `legacy-store`. |
| Upload | Multer disk lokal | Cloudinary dipakai bila tiga environment Cloudinary tersedia; disk lokal tetap menjadi fallback development. |
| Pembayaran | Midtrans tersedia | Seed menonaktifkan QRIS/Midtrans. Jangan isi key production untuk demo. |
| Environment | `.env.example` tersedia | Tidak ada secret atau `.env` yang ditambahkan ke Git. |
| Android sync | Sinkronisasi master/offline tersedia | Query root otomatis tenant-scoped; daftar user dan `package_items` juga dibatasi ke usaha aktif. |

## Model multi-usaha

`Store` dipakai sebagai batas satu usaha (tenant), bukan cabang. Tidak ditemukan konsep business/cabang yang mapan pada schema lama, sehingga menambah `businessId` hanya akan menambah kompleksitas tanpa kebutuhan saat ini.

- `StoreMembership` menghubungkan user ke store dan menyimpan role per usaha.
- `AuthSession.activeStoreId` menjadi sumber usaha aktif yang dipercaya server.
- Frontend hanya meminta pergantian store. Backend memverifikasi `(userId, storeId)` dan status aktif membership/store sebelum mengubah sesi.
- Middleware menjalankan seluruh controller dalam konteks store server-side. Query, create, update, delete, aggregate, dan upsert untuk model tenant selalu ditambah/ditimpa dengan `storeId` konteks.
- Data yang langsung memiliki `storeId`: kategori, produk/layanan, pelanggan, transaksi, pergerakan stok, pengaturan, loyalty, pengeluaran, shift, saved transaction, penerimaan stok, addon, meja, paket, supplier, dan lisensi.
- Detail transaksi dan pembayaran mengikuti transaksi induk; item penerimaan mengikuti penerimaan induk; item paket mengikuti paket induk. Operasi reset dan sync pada tabel anak memakai filter relasi ke store induk.
- User tetap global agar satu login dapat mengakses beberapa usaha. Daftar, role, status akses, dan penghapusan pegawai diproses melalui membership usaha aktif. Menghapus pegawai hanya mencabut akses pada usaha tersebut.

Global unique key lama (`sku`, `memberId`, `phone`, `invoiceNumber`, dan beberapa `androidId`) sengaja belum diubah agar migration aman dan kompatibel dengan web/Android. Seed memakai prefix per usaha untuk mencegah benturan. Pembatasan akses tetap dilakukan oleh `storeId`; global uniqueness tidak memberikan akses lintas tenant.

## Migrasi database

Migration berada di `pos-be/prisma/migrations/202610100001_add_multistore_demo/migration.sql`. Migration tidak menghapus tabel atau record:

1. membuat `stores` dan `store_memberships`;
2. membuat `legacy-store`;
3. memberikan membership ke seluruh user lama berdasarkan role lama;
4. menambah kolom `store_id` sebagai nullable;
5. mengisi semua data lama dengan ID `legacy-store`;
6. baru setelah itu mengubah kolom menjadi required dan menambah index/FK.

### Database lama yang sudah berisi LitePOS

1. Buat backup database.
2. Pastikan tabel singleton tidak memiliki lebih dari satu record untuk `store_licenses`, `store_settings`, dan `loyalty_config`. Migration akan berhenti (tanpa menghapus data) bila unique constraint tidak dapat dibuat.
3. Isi `DATABASE_URL` ke database lama.
4. Jalankan:

```bash
cd pos-be
npx prisma migrate deploy
npx prisma generate
```

### Database demo baru/kosong

Karena repo lama tidak memiliki baseline migration, database kosong dibuat dari schema final lalu migration ditandai sudah terwakili:

```bash
cd pos-be
npx prisma db push
npx prisma migrate resolve --applied 202610100001_add_multistore_demo
npx prisma generate
```

Jangan menjalankan `migrate deploy` langsung terhadap database benar-benar kosong karena migration ini sengaja merupakan migration incremental untuk schema LitePOS lama.

## Seed demo

Seed idempotent membuat:

- Laundry Ceria (`LAUNDRY`): layanan kiloan/satuan, unit kg/pcs, pelanggan, dan transaksi dengan status `PROCESSING`.
- Toko Pakaian Warna Warni (`RETAIL`): kategori, stok, dan varian ukuran/warna sebagai SKU terpisah.
- satu owner, admin, dan kasir yang memiliki membership pada kedua usaha;
- settings, loyalty, lisensi demo, pelanggan, transaksi, detail transaksi, dan pembayaran tunai dummy terpisah.

Semua gateway dinonaktifkan. Password tidak ada di source; tentukan sebelum seed:

```bash
SEED_OWNER_PASSWORD=... \
SEED_ADMIN_PASSWORD=... \
SEED_CASHIER_PASSWORD=... \
npm run seed
```

Nama login demo adalah `owner-demo`, `admin-demo`, dan `kasir-demo` (email juga dapat dipakai). Untuk memaksa penggantian password pertama, set `SEED_REQUIRE_PASSWORD_CHANGE=true`.

## Panduan deploy setelah repo demo baru dibuat

Alur request hasil akhirnya adalah `browser → Cloudflare Pages/Functions → Render API → TiDB`, sedangkan file gambar langsung disimpan backend ke Cloudinary. Pages Functions hanya menjadi proxy `/api/*` dan `/uploads/*`; `_routes.json` memastikan halaman dan asset statis tidak menghabiskan invocation Functions.

Dokumentasi resmi yang relevan: [Next.js static export di Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/), [Pages Functions variables](https://developers.cloudflare.com/pages/functions/bindings/#environment-variables), [Render Blueprint](https://render.com/docs/infrastructure-as-code), [TiDB + Prisma](https://docs.pingcap.com/developer/dev-guide-sample-application-nodejs-prisma/), dan [kredensial Cloudinary](https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials).

### 0. Persiapan repo demo

Setelah Anda membuat repo baru, salin branch ini ke repo tersebut lalu pastikan file berikut ikut masuk Git:

- `render.yaml`;
- `pos-fe/functions/**`, `pos-fe/public/_headers`, `pos-fe/public/_routes.json`, dan `pos-fe/wrangler.toml`;
- `pos-be/prisma/migrations/**`;
- kedua `package-lock.json`.

Jangan commit `.env`, `.env.local`, `.dev.vars`, connection string, API secret, atau password seed. Sebelum push pertama, jalankan pemeriksaan lokal:

```powershell
git status --short
git diff --check

Set-Location pos-be
npm ci
npm test
npm run build

Set-Location ../pos-fe
npm ci
$env:STATIC_EXPORT = 'true'
npm run build
Remove-Item Env:\STATIC_EXPORT
```

### 1. Buat penyimpanan gambar Cloudinary

1. Buat akun/produk environment Cloudinary Free.
2. Buka **Settings → API Keys**.
3. Catat `Cloud name`, `API key`, dan `API secret`.
4. Jangan taruh ketiganya di frontend. `API secret` hanya boleh menjadi secret backend Render.

Backend otomatis memakai Cloudinary bila ketiga variabel berikut terisi; jika salah satu kosong, backend jatuh ke disk lokal yang tidak persisten di Render Free:

```text
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### 2. Buat database TiDB Cloud Starter

1. Buat cluster **Starter** di region terdekat yang tersedia.
2. Melalui SQL Editor, buat database kosong, misalnya:

```sql
CREATE DATABASE IF NOT EXISTS litepos_demo;
```

3. Pada halaman cluster pilih **Connect**, pilih public endpoint/MySQL, lalu salin host, port, username, dan password.
4. Bentuk URL Prisma berikut. Password yang memiliki karakter khusus harus di-percent-encode.

```text
mysql://USERNAME:PASSWORD@HOST:4000/litepos_demo?sslaccept=strict
```

TiDB Starter public endpoint wajib memakai TLS, sehingga jangan menghapus `sslaccept=strict`. Simpan URL ini hanya sebagai secret `DATABASE_URL` atau environment lokal sementara.

#### Inisialisasi database demo kosong

Jalankan dari komputer tepercaya setelah clone repo demo. Contoh PowerShell:

```powershell
Set-Location pos-be
$env:DATABASE_URL = 'mysql://USERNAME:PASSWORD@HOST:4000/litepos_demo?sslaccept=strict'
$env:SEED_OWNER_PASSWORD = 'PASSWORD-KUAT-YANG-BERBEDA'
$env:SEED_ADMIN_PASSWORD = 'PASSWORD-KUAT-YANG-BERBEDA'
$env:SEED_CASHIER_PASSWORD = 'PASSWORD-KUAT-YANG-BERBEDA'
$env:SEED_REQUIRE_PASSWORD_CHANGE = 'false'

npm ci
npx prisma db push
npx prisma migrate resolve --applied 202610100001_add_multistore_demo
npx prisma generate
npm run seed

Remove-Item Env:\DATABASE_URL
Remove-Item Env:\SEED_OWNER_PASSWORD
Remove-Item Env:\SEED_ADMIN_PASSWORD
Remove-Item Env:\SEED_CASHIER_PASSWORD
Remove-Item Env:\SEED_REQUIRE_PASSWORD_CHANGE
```

`db push` hanya dipakai untuk database demo yang benar-benar kosong. `migrate resolve` menandai migration incremental sebagai sudah terwakili oleh schema final; perintah itu tidak menjalankan SQL migration untuk kedua kali. Seed bersifat idempotent dan tidak menimpa password user yang sudah ada.

Untuk database LitePOS lama yang berisi data, **jangan** memakai langkah di atas. Buat backup lalu gunakan `npx prisma migrate deploy` sesuai bagian “Migrasi database”. Semua data lama akan ditempatkan di `legacy-store`.

### 3. Deploy backend ke Render Free

Jalur yang disarankan adalah Blueprint karena `render.yaml` sudah tersedia:

1. Masuk Render lalu pilih **New → Blueprint**.
2. Hubungkan repo demo baru dan pilih branch production, biasanya `main`.
3. Pastikan Blueprint membaca `/render.yaml` dari root repo.
4. Konfirmasi service `litepos-demo-api`, runtime Node, plan Free, root `pos-be`.
5. Isi nilai yang diminta oleh entri `sync: false`:

| Variable | Isi |
| --- | --- |
| `DATABASE_URL` | URL TiDB TLS dari langkah 2 |
| `CORS_ORIGINS` | `https://NAMA-PAGES.pages.dev,https://*.NAMA-PAGES.pages.dev` |
| `CLOUDINARY_CLOUD_NAME` | Cloud name |
| `CLOUDINARY_API_KEY` | API key |
| `CLOUDINARY_API_SECRET` | API secret |

`JWT_SECRET` dan `LICENSE_CODE_SECRET` dibuat otomatis oleh Render melalui `generateValue: true`. Jangan menyamakan atau menyalin kedua secret itu. Blueprint juga menetapkan:

```text
NODE_ENV=production
HOST=0.0.0.0
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
```

Build backend adalah `npm install && npm run build`, start command `npm start`, dan health check `/api/health`. `autoDeploy: false` sengaja dipakai agar push berikutnya tidak otomatis mengubah demo tanpa persetujuan.

Setelah deploy selesai, simpan URL seperti `https://litepos-demo-api.onrender.com`, lalu buka:

```text
https://litepos-demo-api.onrender.com/api/health
```

Respons yang benar adalah HTTP 200 dengan `database: "CONNECTED"`. HTTP 500 berarti periksa `DATABASE_URL`, TLS, status cluster, dan log Render. Render Free tidur setelah tidak ada traffic; request pertama setelah idle dapat lambat dan bukan otomatis berarti deploy gagal.

### 4. Deploy frontend ke Cloudflare Pages

1. Di Cloudflare buka **Workers & Pages → Create application → Pages → Import an existing Git repository**.
2. Pilih repo demo dan branch production.
3. Gunakan konfigurasi build berikut:

| Opsi | Nilai |
| --- | --- |
| Framework preset | Next.js (Static HTML Export) |
| Root directory | `pos-fe` |
| Build command | `npm ci && npm run build` |
| Build output directory | `out` |

4. Tambahkan production build variables:

```text
STATIC_EXPORT=true
NEXT_PUBLIC_API_URL=https://NAMA-PAGES.pages.dev
```

5. Tambahkan variable untuk Pages Functions di **Settings → Variables and Secrets**:

```text
API_PROXY_TARGET=https://litepos-demo-api.onrender.com
```

`API_PROXY_TARGET` bukan secret, tetapi tetap lebih mudah dikelola dari dashboard. Jangan tambahkan `/api` pada ujung nilainya. Jangan pernah memasukkan `DATABASE_URL`, Cloudinary secret, JWT secret, atau password seed ke Cloudflare.

6. Deploy Pages. Pastikan build log memasukkan folder `functions`; endpoint berikut harus diteruskan ke Render:

```text
https://NAMA-PAGES.pages.dev/api/health
```

7. Setelah URL Pages final diketahui, kembali ke Render dan pastikan `CORS_ORIGINS` persis memuat origin tersebut. Redeploy/restart backend bila Render memintanya.

`NEXT_PUBLIC_API_URL` sengaja menunjuk ke origin Pages sendiri, bukan langsung ke Render. Dengan demikian browser mengakses `/api` pada domain yang sama dan cookie HttpOnly tetap first-party. Untuk custom domain, ganti nilai menjadi `https://demo.domain-anda.tld`, tambahkan origin itu ke `CORS_ORIGINS`, lalu rebuild Pages.

Preview Pages dapat memakai hostname berbeda. Wildcard `https://*.NAMA-PAGES.pages.dev` mengizinkan preview di backend, tetapi build preview tetap harus memakai origin yang benar bila login ingin diuji sepenuhnya. Untuk demo publik utama, gunakan deployment production Pages.

### 5. Pembayaran demo

Seed membuat `enableQris=false` dan backend menolak gateway QRIS saat integrasi dinonaktifkan. Untuk demo biasa gunakan pembayaran tunai dummy. Jangan isi key Midtrans production.

Jika QRIS memang perlu didemokan kemudian:

1. gunakan **Midtrans Sandbox** saja;
2. isi sandbox server/client key melalui secret Render/variable build frontend;
3. pertahankan `MIDTRANS_IS_PRODUCTION=false`;
4. aktifkan QRIS hanya pada store demo setelah menguji callback sandbox.

### 6. Verifikasi pascadeploy

1. Buka `https://NAMA-PAGES.pages.dev/api/health`; pastikan database connected.
2. Login dengan `owner-demo`, `admin-demo`, atau `kasir-demo` dan password seed masing-masing.
3. Pindah dari **Laundry Ceria** ke **Toko Pakaian Warna Warni** melalui selector sidebar.
4. Pastikan produk, kategori, pelanggan, transaksi, shift, dashboard, dan laporan berubah mengikuti usaha aktif.
5. Simpan ID produk/transaksi Laundry, pindah ke Toko Pakaian, lalu coba membuka/mengubah ID tadi melalui Network/DevTools; API harus memberi 404/menolak dan data tidak berubah.
6. Pada Laundry, buat transaksi layanan lalu ubah status `Diterima → Diproses → Siap Diambil → Sudah Diambil`.
7. Pada toko pakaian, jual satu SKU varian ukuran/warna dan pastikan hanya stok SKU tersebut di toko itu yang berkurang.
8. Upload gambar produk. Nilai URL respons/database harus diawali `https://res.cloudinary.com/`, bukan `/uploads/`.
9. Konfirmasi metode pembayaran demo tetap cash dan tidak ada request ke Midtrans production.
10. Ulangi sebagai kasir untuk memastikan menu/operasi admin tetap ditolak backend, bukan hanya disembunyikan UI.

### 7. Troubleshooting

| Gejala | Pemeriksaan |
| --- | --- |
| `/api/health` di Pages memberi 503 | `API_PROXY_TARGET` belum terisi atau belum redeploy Pages. |
| Health Render 500 | URL TiDB salah, password belum di-encode, `sslaccept=strict` hilang, atau schema belum dibuat. |
| Login sukses lalu kembali ke login | `NEXT_PUBLIC_API_URL` harus origin Pages yang dibuka; periksa cookie di DevTools dan `CORS_ORIGINS`. |
| CORS error | Jangan pakai trailing slash pada origin; masukkan production dan preview origin secara eksplisit/wildcard. |
| Upload menghasilkan `/uploads/...` | Satu atau lebih dari tiga variabel Cloudinary kosong; filesystem Render Free tidak persisten. |
| Request pertama sangat lambat | Render Free sedang cold start; tunggu lalu ulangi health check. |
| Static page 404 atau Functions tidak ditemukan | Root harus `pos-fe`, output `out`, dan `functions/**` harus berada dalam repo. |
| Seed gagal unique constraint | Database tidak kosong atau seed lama memakai SKU/telepon yang sama; gunakan database demo baru atau audit data sebelum mengulang. |

### 8. Update dan rollback

- Karena `autoDeploy: false`, setelah push perubahan pilih manual deploy di Render dan trigger deployment Pages sesuai kebutuhan.
- Cloudflare Pages dapat mengembalikan deployment frontend sebelumnya.
- Render dapat mengembalikan build aplikasi sebelumnya, tetapi backend lama yang tidak mengenal `store_id` tidak kompatibel untuk write setelah migration multi-store.
- Rollback penuh ke versi sebelum multi-store memerlukan restore backup database sebelum migration. Jangan mencoba drop kolom/table tenant secara manual.
- Sebelum setiap perubahan schema berikutnya, backup database dan pakai migration baru; jangan mengedit migration yang sudah diterapkan.

## Catatan Android-web

`D:\AndroidPos-web` diperiksa read-only sebagai referensi. Implementasi di sana memiliki fitur restoran/kitchen, partial payment, jadwal ketersediaan, dan reset data lanjutan yang tidak dibawa karena di luar scope demo Laundry/Retail dan membutuhkan perubahan schema besar. Perubahan yang relevan untuk kompatibilitas—tenant scoping pada master sync serta dukungan URL upload remote—sudah diterapkan di LitePOS ini. Folder Android-web tidak diubah.

## Pemeriksaan lokal

Perintah yang digunakan:

```bash
cd pos-be
npx prisma validate
npm run build
npm test

cd ../pos-fe
STATIC_EXPORT=true npm run build
```

Audit frontend setelah upgrade minor ke Next.js 16.4.0 melaporkan 0 vulnerability. SDK Cloudinary dan Nodemailer backend juga sudah dinaikkan ke versi aman. Audit backend masih melaporkan 4 advisory high dari `@prisma/config`/`effect`/`deepmerge-ts` yang hanya ditarik oleh Prisma CLI pada `devDependencies`; runtime Express tidak memuat paket tersebut. Menghilangkannya saat ini memerlukan upgrade major Prisma dan review migration, jadi jangan menjalankan `npm audit fix --force` tanpa review kompatibilitas.
