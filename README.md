# KasirPOS

Aplikasi kasir web dan Android dengan fitur yang sama seperti versi asal: produk, stok, pelanggan, pegawai, transaksi, shift, laporan, dan pengelolaan usaha. Nama aplikasi menjadi **KasirPOS**, logo bawaan dihapus, dan ikon launcher Android memakai huruf **K**. Logo toko milik pengguna tetap didukung.

## Mulai di sini

- [Panduan deployment lengkap](PANDUAN_DEPLOYMENT.md): database TiDB baru, Vercel, Cloudflare Pages, dan build APK.
- [Panduan pengguna](PANDUAN_PENGGUNA.md): pendaftaran usaha, login, pemasangan Android, dan penggunaan.
- [Hasil pengujian](HASIL_PENGUJIAN.md): pemeriksaan yang lulus dan bagian yang masih menunggu deployment/build native.

Repository tujuan: **abrahamyada24/webandroid-pos**. Semua project hosting dan database KasirPOS harus terpisah dari LitePOS Demo.

## Struktur

| Folder | Isi |
| --- | --- |
| `pos-fe` | Next.js, static export, Pages Functions sebagai proxy API |
| `pos-be` | Express, Prisma/MySQL, konfigurasi Vercel |
| `pos-android` | React Native, package `com.kasirpos.app` |
| `pos-desktop` | Klien desktop yang disertakan dari versi asal |

## Persiapan lokal

Jalankan dari root proyek menggunakan Node.js 22:

```powershell
npm run setup:local
npm run check:branding
```

Isi koneksi **database KasirPOS baru** pada `pos-be/.env`. Install dependency dengan `npm ci` di masing-masing folder aplikasi. Jalankan `npm run dev` backend dan frontend pada terminal terpisah.

- Website lokal: `http://localhost:3100`
- Backend lokal: `http://127.0.0.1:5100`

Script setup menyimpan cadangan konfigurasi lama di `.demo-runtime`, yang diabaikan Git. Script tidak membuat atau mengubah database/hosting.

## Sebelum membagikan Android

Alamat backend di `pos-android/src/config/deployment.ts` masih berupa domain `.example` sampai diganti dengan origin Vercel KasirPOS yang sebenarnya. Jalankan `npm run check:deployment` setelah mengisinya. APK memerlukan kunci rilis KasirPOS dan pengujian perangkat.

Frontend menggunakan `/api` pada domainnya sendiri. Cloudflare harus memiliki `API_PROXY_TARGET` yang mengarah ke Vercel **KasirPOS**. Ketiga kredensial Cloudinary diperlukan untuk upload pada Vercel.

Dokumen lain yang bertanda **ARSIP** adalah referensi konfigurasi lama. Gunakan panduan deployment KasirPOS di atas.
