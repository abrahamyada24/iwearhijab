# Deployment Iwearing Hijab

Target: Cloudflare Pages untuk frontend, Vercel untuk backend Express, TiDB Cloud untuk database MySQL, dan Cloudinary untuk gambar. Seluruh nama domain di bawah adalah placeholder; layanan belum dibuat atau di-deploy oleh Codex.

Urutan pengerjaan: **TiDB → inisialisasi database dari laptop → Cloudinary → Vercel → Cloudflare Pages → pengecekan login/upload**. Nama yang disarankan berikut belum menjamin ketersediaan domain:

| Komponen | Nama yang disarankan |
| --- | --- |
| Instance TiDB yang sudah dibuat | `iwearpos` |
| Database di dalam instance | `iwear` |
| Project Vercel backend | `iwearhijab-api` |
| Project Cloudflare Pages | `iwearhijab` |
| Folder Cloudinary | `iwear` |

Nama instance `iwearpos` dan nama database `iwear` boleh berbeda. Setiap langkah di bawah menyebutkan hasil yang perlu diperiksa sebelum lanjut.

```text
Browser → Cloudflare Pages
            /api/* → Pages Functions → Vercel Express → TiDB (TLS)
                                           └ upload gambar → Cloudinary
Browser ← URL gambar HTTPS Cloudinary
```

## 1. TiDB dan inisialisasi toko

### 1A. Dari layar Connect pada gambar

Pada gambar pengguna, instance bernama `iwearpos`, Branch `main`, Connection Type `Public Endpoint`, Connect With `Prisma`, dan Database masih `sys`. Belum ada password yang dihasilkan.

1. Klik **Generate Password**, lalu simpan password yang muncul di pengelola password. Jangan tempel password di GitHub, chat, atau screenshot publik.
2. Tutup dialog Connect untuk membuat database aplikasi terlebih dahulu.
3. Dari halaman instance `iwearpos`, buka **SQL Editor**. Pilih instance/branch `main` bila diminta, lalu jalankan:

   ```sql
   CREATE DATABASE IF NOT EXISTS iwear;
   SHOW DATABASES;
   ```

4. Pastikan hasil menampilkan `iwear`. Jangan membuat tabel aplikasi di database sistem `sys`.
5. Buka lagi **Connect**, pilih `Public Endpoint`, Branch `main`, Database **`iwear`**, OS Windows, dan Connect With Prisma.
6. Salin connection string yang baru. Pertahankan username lengkap beserta prefix instance yang diberikan TiDB; jangan menggantinya menjadi `root` saja.
7. Pastikan bagian setelah port adalah **`:4000/iwear`**, bukan `/sys`. Ganti placeholder `<PASSWORD>` dengan password yang dibuat tadi bila masih tampil sebagai placeholder.

Tambahkan parameter pool kecil pada connection string. Hasilnya mengikuti pola berikut; salin host dan username sebenarnya dari TiDB, bukan dari contoh ini:

```dotenv
DATABASE_URL="mysql://USER:PASSWORD@HOST:4000/iwear?sslaccept=strict&connection_limit=1&pool_timeout=20"
```

URL-encode username/password bila mengandung karakter khusus. Gunakan TLS strict dan pengaturan akses jaringan TiDB yang mengizinkan koneksi backend Vercel. Jangan memakai database toko lain.

Contoh encoding: `@` pada password menjadi `%40`, `#` menjadi `%23`, dan `:` menjadi `%3A`. Encode bagian username/password saja, bukan seluruh URL. Jangan melakukan encode ulang pada password yang sudah di-encode.

### 1B. Akses jaringan laptop dan Vercel

Pesan hijau pada gambar hanya menunjukkan **IP laptop saat itu sudah diizinkan**. Itu belum membuktikan backend Vercel diizinkan mengakses TiDB.

1. Buka pengaturan networking/public endpoint instance. Untuk Starter/Essential, buka konfigurasi firewall/allowed IP rules pada Public Endpoint; nama menu dapat menyesuaikan tampilan console.
2. Pertahankan rule IP laptop untuk menjalankan Prisma/seed dari laptop. Jika IP internet berubah, perbarui rule ini.
3. Untuk Vercel, gunakan IP egress statis jika akun/infrastruktur menyediakannya dan izinkan IP tersebut pada TiDB. IP outbound Vercel secara default dinamis, jadi jangan memasukkan IP hasil ping domain Vercel.
4. Jika tahap awal menggunakan pilihan **Allow access from anywhere** / `0.0.0.0/0`, pahami bahwa semua IP dapat mencoba menghubungi endpoint database. Login database tetap memerlukan username/password dan TLS; pilih opsi ini hanya jika kamu menerima cakupan jaringan tersebut. Untuk akses yang lebih ketat, gunakan egress statis dan allowlist.

Referensi: [koneksi public endpoint TiDB](https://docs.pingcap.com/tidbcloud/connect-via-standard-connection-serverless/), [firewall Starter/Essential](https://docs.pingcap.com/tidbcloud/configure-serverless-firewall-rules-for-public-endpoints/), dan [outbound IP Vercel](https://vercel.com/kb/guide/how-to-allowlist-deployment-ip-address).

### 1C. Buat tabel dan akun pemilik dari laptop

1. Buka PowerShell dan jalankan `node --version`. Gunakan Node.js 22 untuk menyamakan dengan backend deployment.
2. Buka file `D:\iwear\pos-be\.env` menggunakan editor. File lokal ini sudah dibuat; tidak perlu menyalin template dengan menimpa file tersebut.
3. Edit tiga nilai berikut. Biarkan secret lokal yang sudah dibuat tetap ada:

   ```dotenv
   DATABASE_URL="mysql://USER:PASSWORD@HOST:4000/iwear?sslaccept=strict&connection_limit=1&pool_timeout=20"
   SEED_OWNER_EMAIL="EMAIL_PEMILIK_TOKO"
   SEED_OWNER_PASSWORD="PASSWORD_AWAL_MINIMAL_12_KARAKTER"
   ```

4. Ganti seluruh placeholder dengan nilai nyata. Email ini adalah pemilik toko, bukan akun login TiDB.
5. Simpan file, lalu jalankan perintah berikut satu per satu. Jika satu perintah gagal, perbaiki dahulu sebelum melanjutkan.

Pada **database baru kosong**, isi juga `SEED_OWNER_EMAIL` dan `SEED_OWNER_PASSWORD` (minimal 12 karakter), kemudian jalankan dari `pos-be`:

```powershell
Set-Location D:\iwear\pos-be
npm ci
npm run prisma:generate
npm run prisma:push
npm run seed
```

Ini membuat satu toko Iwearing dan akun pemilik ber-username `admin`, tanpa transaksi/produk contoh. Password wajib diganti saat login pertama. Trial lisensi upstream tetap berlaku. Jangan menjalankan seed otomatis pada setiap build Vercel. Untuk database yang sudah berisi data, tinjau migrasi dan backup sebelum perubahan schema.

Hasil yang diharapkan: Prisma berhasil membuat tabel dan seed menampilkan `Toko Iwearing Hijab siap`. Refresh daftar tabel/SQL Editor TiDB. Akun login aplikasi memakai username **`admin`** atau email pemilik, dan password `SEED_OWNER_PASSWORD` yang kamu isi. Jangan memakai password root TiDB sebagai password akun toko.

## 2. Cloudinary

1. Masuk ke [Cloudinary Console](https://console.cloudinary.com/).
2. Pilih product environment yang akan dipakai. Akun dengan satu environment tetap bisa memakai folder khusus `iwear`.
3. Catat **Cloud name** dari Dashboard.
4. Buka ikon **Settings → API Keys**. Salin **API Key** dan tampilkan/salin **API Secret**. Jika console meminta verifikasi akun, selesaikan sendiri di console.
5. Simpan ketiga nilai untuk dimasukkan ke Vercel pada langkah 3. Project memakai tiga variable terpisah di bawah, sehingga tidak cukup hanya mengisi `CLOUDINARY_URL`.

Gunakan environment/product Cloudinary khusus toko atau folder `iwear`. Ambil cloud name, API key, dan API secret. Ketiganya hanya diisi pada backend Vercel; upload menggunakan SDK backend yang sudah tersedia. Tidak perlu unsigned upload preset.

```dotenv
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_API_KEY
CLOUDINARY_API_SECRET=YOUR_API_SECRET
CLOUDINARY_FOLDER=iwear
```

Gambar disimpan di `iwear/store-ID`. URL HTTPS hasil upload disimpan pada TiDB; file gambar ada di Cloudinary. Login memakai logo statis yang sudah masuk repository. Upload aplikasi dibatasi 2 MB per gambar. Jangan mengandalkan folder upload lokal Vercel untuk penyimpanan permanen.

Folder akan terbuat ketika backend mengunggah gambar; tidak perlu mengunggah semua gambar manual dari dashboard. Referensi: [letak kredensial Cloudinary](https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials).

## 3. Backend Vercel

### 3A. Import repository

1. Masuk ke [Vercel Dashboard](https://vercel.com/dashboard).
2. Pilih **Add New → Project** dan hubungkan GitHub jika belum terhubung.
3. Import repository **`abrahamyada24/iwearhijab`**. Beri nama project yang disarankan **`iwearhijab-api`**.
4. Klik **Edit** pada Root Directory, lalu pilih **`pos-be`**. Periksa bahwa pengaturan ini bukan root repository dan bukan `pos-fe`.
5. Sesuaikan pengaturan berikut. Bila Express tidak otomatis terdeteksi pada pilihan preset, gunakan Other; backend sudah memiliki entrypoint `src/app.js` yang didukung Vercel.

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

### 3B. Masukkan environment backend

Di formulir import, buka Environment Variables sebelum Deploy. Untuk perubahan berikutnya gunakan **Project → Settings → Environment Variables**. Pilih environment **Production**. Preview hanya perlu dikonfigurasi jika memang akan dipakai; jangan menghubungkan preview ke database produksi tanpa disengaja.

Pada kolom Value dashboard, tempel nilai mentah **tanpa tanda kutip pembungkus**. Tanda kutip pada contoh `.env` hanya untuk format file `.env`.

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

Untuk membuat tiga secret aplikasi yang berbeda, jalankan perintah ini **tiga kali** di PowerShell dan simpan masing-masing hasilnya sebagai `JWT_SECRET`, `LICENSE_CODE_SECRET`, serta `PLATFORM_ADMIN_JWT_SECRET`:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Gunakan `CORS_ORIGINS=https://iwearhijab.pages.dev` sebagai rencana awal jika nama Pages itu tersedia. Setelah Cloudflare memberikan domain nyata, sesuaikan nilainya. Tidak ada `/login`, `/api`, atau slash penutup pada origin. Jika memakai custom domain juga, pisahkan origin dengan koma.

Jangan isi `HOST`, `PORT`, `UPLOAD_DIR`, `SEED_OWNER_EMAIL`, atau `SEED_OWNER_PASSWORD` di Vercel untuk alur ini. Vercel menangani listener; schema dan seed sudah disiapkan sekali dari laptop. Ketiga kredensial Cloudinary harus terisi lengkap agar backend tidak jatuh ke penyimpanan disk lokal yang tidak permanen.

### 3C. Deploy dan verifikasi

1. Klik **Deploy**, lalu tunggu status Ready.
2. Catat domain **production** yang sebenarnya dari halaman project; jangan menebak domain dari nama project. Contoh bentuknya `https://YOUR_BACKEND.vercel.app`.
3. Buka URL `/api/health` pada domain tersebut. Hasil yang benar:

   ```json
   { "database": "CONNECTED", "server": "ONLINE" }
   ```

4. Jika status gagal, buka **Logs/Runtime Logs** deployment untuk melihat penyebabnya.
5. Jika mengubah environment, buka **Deployments → deployment terbaru → menu tiga titik → Redeploy**. Environment baru hanya berlaku pada deployment baru.

Deploy backend, lalu cek `https://YOUR_BACKEND.vercel.app/api/health`. Respons harus `server: ONLINE` dan `database: CONNECTED`. Bila Vercel Deployment Protection aktif, Pages Functions tidak dapat memanggil endpoint tersebut tanpa konfigurasi akses yang sesuai; pastikan endpoint produksi dapat dipakai aplikasi sebelum menguji frontend.

Referensi: [Express di Vercel](https://vercel.com/docs/frameworks/backend/express) dan [pengelolaan environment](https://vercel.com/docs/environment-variables/managing-environment-variables).

## 4. Frontend Cloudflare Pages

### 4A. Buat project Pages

1. Masuk ke [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Buka **Workers & Pages → Create application → Pages**.
3. Pilih **Import an existing Git repository** / **Connect to Git**. Pilih GitHub dan berikan akses ke repository `iwearhijab`.
4. Pilih **`abrahamyada24/iwearhijab` → Begin setup**.
5. Gunakan nama project **`iwearhijab`** bila tersedia. Jika berbeda, nama pada `pos-fe/wrangler.jsonc` juga perlu disesuaikan sebelum deployment berikutnya.
6. Buka bagian pengaturan build dan isi tabel berikut. Preset static export sesuai struktur aplikasi ini.

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

### 4B. Hubungkan runtime Functions ke backend

1. Saat formulir setup menyediakan Environment Variables, isi `NODE_VERSION=22` dan `STATIC_EXPORT=true`. Biarkan `NEXT_PUBLIC_API_URL` tidak dibuat/kosong.
2. Simpan/deploy project untuk pertama kali. Halaman statis dapat tampil meskipun backend belum terhubung; jangan menganggap login siap hanya karena halaman tampil.
3. Buka **project Pages → Settings → Variables and Secrets → Add**. Pilih **Production**.
4. Buat variable bernama **`API_PROXY_TARGET`**, dengan value domain production Vercel yang sebenarnya, misalnya `https://YOUR_BACKEND.vercel.app`. Jangan tambah `/api`.
5. Simpan sebagai **Secret/Encrypt** supaya tersedia sebagai runtime binding tanpa memasukkan URL deployment ke konfigurasi `vars` di repository. URL ini sendiri bukan password. Bila field plaintext dikelola dari Wrangler dan tidak dapat diedit di dashboard, tetap gunakan Secret untuk binding runtime ini.
6. Simpan, lalu buat deployment ulang melalui **Deployments → Retry deployment/Redeploy** sesuai tombol yang tersedia. Jangan hanya reload browser; binding baru perlu deployment baru.
7. Tambahkan binding yang sama pada Preview hanya jika kamu memang ingin preview memakai backend tersebut.
8. Buka **domain Cloudflare yang sebenarnya + `/api/health`**. Respons harus sama dengan endpoint health Vercel.

Tambahkan domain frontend final ke `CORS_ORIGINS` Vercel jika berbeda dari rencana awal, lalu redeploy backend. Setelah itu cek ulang health melalui kedua domain.

`wrangler.jsonc` mencatat nama project yang diusulkan (`iwearhijab`), output `out`, dan compatibility date. Sesuaikan nama itu bila project Pages memakai nama lain. Folder `functions` harus tetap berada di `pos-fe/functions`, sejajar dengan `package.json`; bukan dipindahkan ke `out`. Gunakan Git integration agar Pages Functions ikut ter-deploy. Jangan hanya mengunggah folder `out` lewat dashboard drag-and-drop.

Browser memanggil `/api` pada origin Cloudflare sendiri. Pages Functions meneruskan request dan cookie ke Vercel, termasuk respons Set-Cookie. Pertahankan `NEXT_PUBLIC_API_URL` kosong agar sesi cookie tetap first-party. `_routes.json` membatasi Functions pada `/api/*` dan `/uploads/*`; halaman/aset statis dilayani Pages. CSP frontend sudah mengizinkan gambar `https://res.cloudinary.com`.

Jangan menaruh `DATABASE_URL`, password TiDB, `JWT_SECRET`, atau `CLOUDINARY_API_SECRET` di frontend. Cloudflare untuk proyek ini hanya memerlukan konfigurasi build dan alamat proxy; koneksi TiDB serta upload Cloudinary ditangani Vercel.

Referensi: [static Next.js di Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/), [runtime variables/secrets](https://developers.cloudflare.com/pages/functions/bindings/), dan [Wrangler sebagai source of truth](https://developers.cloudflare.com/pages/functions/wrangler-configuration/).

## 5. Pemeriksaan setelah deploy

1. Cek `/api/health` melalui domain backend dan melalui domain Cloudflare.
2. Buka `/login`, login pemilik, lalu ganti password awal.
3. Tambahkan satu produk uji dan unggah gambar; pastikan URL berasal dari Cloudinary dan tetap tampil setelah reload.
4. Uji transaksi, member/poin, stok, shift, laporan, dan logout pada database toko.
5. Isi domain backend nyata pada konfigurasi Android sebelum build APK, lalu jalankan `npm run check:deployment`.

Login toko: `https://DOMAIN_PAGES/login`, username **`admin`** atau email pemilik, password awal dari `SEED_OWNER_PASSWORD`. Akun toko dibuat oleh seed, bukan lewat tombol daftar. Panel super admin menggunakan `/super-admin/login` dan kredensial `PLATFORM_ADMIN_*` yang berbeda; tidak diperlukan untuk transaksi kasir sehari-hari.

Untuk memeriksa jaringan API dari browser, buka Developer Tools → Network ketika login. Request harus menuju **domain Cloudflare + `/api/auth/login`**, bukan langsung ke domain Vercel.

## 6. Jika ada kendala

| Gejala | Pemeriksaan/perbaikan |
| --- | --- |
| Connection string masih `/sys` | Buat/pilih database `iwear`, lalu salin ulang URL dan perbarui `.env` serta Vercel |
| Prisma P1000 / authentication failed | Periksa password yang dihasilkan, username lengkap ber-prefix, dan encoding karakter khusus |
| Prisma P1001 / timeout, health DISCONNECTED | Periksa host/port, public endpoint, firewall IP laptop/Vercel, TLS, dan `DATABASE_URL` |
| Tabel tidak ditemukan | Jalankan schema push pada database baru yang benar, lalu seed; build Vercel tidak membuat tabel |
| Seed ditolak karena usaha lain | Jangan reset; ganti koneksi ke database khusus Iwearing yang benar |
| Login gagal meski halaman tampil | Pastikan seed berhasil, password akun toko benar, dan health via Cloudflare CONNECTED |
| Cloudflare API 503 dengan pesan API_PROXY_TARGET | Tambahkan Secret runtime Production dan redeploy Pages |
| Cloudflare API 404 atau mengembalikan HTML | Periksa Pages Functions ikut deployment Git; root `pos-fe`, output `out` |
| Redirect/login Vercel atau 401 dari halaman proteksi Vercel | Periksa akses endpoint production; jangan gunakan URL preview terproteksi sebagai proxy target |
| Upload gagal / hilang setelah deploy | Periksa ketiga variable Cloudinary di Vercel; jangan hanya mengisi CLOUDINARY_URL |
| Invalid API key/signature dari Cloudinary | Pastikan cloud name, key, dan secret berasal dari product environment yang sama; redeploy Vercel setelah mengubahnya |
| CORS / cookie tidak tersimpan | Gunakan origin frontend tepat pada CORS_ORIGINS dan biarkan NEXT_PUBLIC_API_URL kosong; gunakan HTTPS |
| Lisensi trial berakhir | Aktivasi melalui alur lisensi yang tersedia; jangan menghapus database untuk mengulang trial |

Jika meminta bantuan, kirim pesan error atau screenshot dengan bagian password, connection string lengkap, API Secret, dan token disamarkan.

Catatan hasil pengujian lokal dan temuan dependency ada di [HASIL_PENGUJIAN_IWEAR.md](HASIL_PENGUJIAN_IWEAR.md). Hosting belum diverifikasi sampai environment dan layanan sebenarnya tersedia.

## Referensi resmi

- [Cloudflare: build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Cloudflare: Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/)
- [Vercel: Express](https://vercel.com/docs/frameworks/backend/express)
- [TiDB: Prisma quickstart](https://github.com/tidb-samples/tidb-nodejs-prisma-quickstart)
- [Cloudinary: Node.js SDK](https://cloudinary.com/documentation/node_integration)
