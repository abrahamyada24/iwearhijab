# Revisi web Iwearing Hijab — 20 Oktober 2026

Implementasi lokal mengikuti MoM 18 Oktober 2026 dan gambar yang dikonfirmasi. Android dan aplikasi desktop native tidak diubah. Midtrans dihapus atas instruksi tambahan pengguna.

## Perubahan

- Hapus halaman, menu, modal, dan API khusus Paket Produk, Supplier, Penerimaan Barang, serta Stock Opname. Riwayat Stok tetap tersedia tanpa penyesuaian/opname. Paket juga dikeluarkan dari kasir dan katalog publik.
- Hapus preorder dari kasir, riwayat transaksi, dashboard, filter/ekspor, pengaturan, serta API khusus. Checkout menolak preorder dan paket.
- Hapus laporan Retur; mekanisme retur transaksi yang sudah ada tetap tersedia untuk Owner.
- Hapus Transfer dan Midtrans: SDK backend, integrasi Snap web, webhook, pengecekan gateway, pengaturan, serta contoh environment. QRIS sekarang selalu dikonfirmasi kasir, dengan label “QRIS”. Nilai enum lama dipertahankan untuk membaca riwayat pembayaran.
- Admin/Owner tetap mendapat edit produk/harga, dashboard lengkap tanpa kartu stok, laporan, dan Pengeluaran. Staff melihat nominal serta jumlah transaksi Cash/QRIS secara terpisah untuk hari berjalan di Asia/Jakarta. QRIS lama dan QRIS manual digabung pada rekap.
- API Pengeluaran dan laporan finansial menolak Staff. Respons Staff tidak memuat HPP, laba, atau pengeluaran, termasuk objek bersarang.
- Tukar Point hanya tersedia untuk member. Popup mengikuti Android: pilih jumlah produk dari keranjang, gunakan sebagian saldo, sisakan poin yang tidak digunakan. Poin untuk satu produk mengikuti pengaturan. Sisa tagihan dibayar Cash/QRIS; tagihan yang seluruhnya tertutup poin dicatat sebagai POINT.
- Server memvalidasi saldo dan jumlah penukaran, menghitung harga produk gratis dari data server, mengurangi stok termasuk produk gratis, serta menyimpan snapshot penukaran dan saldo. Diskon tambahan diterapkan pada barang yang masih dibayar, kemudian pajak. Idempotency key mencegah transaksi/penukaran berulang saat retry.
- Pengeluaran memakai kategori Konveksi, tanpa pilihan Utilitas/Pembelian. Migrasi mengubah Bahan Baku menjadi Konveksi, Utilitas menjadi Lainnya, dan catatan Pembelian menjadi Pengeluaran.
- Tambah Varian dan Warna pada produk. Tombol QR pada kartu produk membuka label berisi QR, nama/varian/warna, dan harga; bisa dicetak atau diunduh. QR menyimpan barcode produk atau SKU. Pemindai dapat mengisi pencarian kasir lalu Enter untuk menambahkan produk.
- Struk 58 mm memakai Arial/Helvetica, tanpa Jenis, dan hanya menampilkan Pelanggan bagi member. Poin tampil dari snapshot transaksi. Alamat baru tidak ditambahkan dari foto referensi.
- Pembayaran sukses otomatis memulai cetak. Preview tetap menyediakan Cetak, Unduh, dan Bagikan. Membuka ulang preview tidak memulai cetak otomatis kedua. Cetak ulang dari riwayat mengikuti format yang sama.
- Sidebar menandai halaman aktif pada semua menu, bukan hanya grup Produk & Stok.

## Printer dan laci

Pada Pengaturan → Printer tersedia koneksi printer serial/Bluetooth melalui Web Serial, untuk perangkat yang mendukungnya. Pasangkan printer terlebih dahulu di komputer, lalu pilih Hubungkan Printer pada Chrome/Edge desktop. Mode ini merasterisasi struk sehingga font/logo tetap sesuai tampilan, lalu mengirim data ESC/POS. Test Print juga menggunakan koneksi ini bila aktif.

- Pembayaran Cash berhasil dengan kembalian mengirim satu pulsa buka laci pada pencetakan otomatis pertama.
- Cash uang pas, QRIS, POINT, label produk, test print, dan cetak ulang tidak mengirim pulsa laci.
- Tanpa koneksi serial, alur cetak membuka dialog browser. Kendali laci otomatis memerlukan koneksi langsung dan printer yang mempunyai port laci; printer Bluetooth biasa belum tentu mempunyai port tersebut.
- Koneksi fisik, kualitas cetak, dan pin laci printer toko belum diuji. Simulasi browser memverifikasi data perintah yang dikirim, bukan keberhasilan mekanis perangkat.

Referensi teknis: [Web Serial](https://developer.chrome.com/docs/capabilities/serial), [serial Bluetooth](https://developer.chrome.com/blog/serial-over-bluetooth), [pulsa laci ESC/POS](https://download4.epson.biz/sec_pubs/pos/reference_en/escpos/esc_lp.html).

## Database dan pemasangan

Migrasi baru: `pos-be/prisma/migrations/202610200001_iwear_web_revision/migration.sql`.

Migrasi menambah Varian/Warna, dua kolom snapshot produk gratis, dan enum POINT. Tidak ada koneksi atau perubahan database nyata dalam pekerjaan ini. Migrasi belum diterapkan dan diperlukan sebelum backend baru dijalankan pada database yang sudah ada. Tinjau kondisi schema/baseline instalasi Iwearing sebelum menjalankannya; dokumen migrasi upstream lama bukan instruksi untuk menerapkan semua migrasi sekaligus. Tabel historis tetap dipertahankan agar referensi transaksi dan sinkronisasi Android lama tidak rusak.

Prisma Client lokal sudah dibuat ulang. Jalankan `npm ci` pada frontend/backend saat memasang hasil revisi. Dependensi `qrcode` ditambahkan pada web dan `midtrans-client` dihapus dari backend. Node.js 22 tetap versi yang diminta proyek; pemeriksaan lokal di perangkat ini menggunakan Node.js 24.15.0.

## Pemeriksaan

- Backend: 60 tes lulus, termasuk controller checkout, penolakan input, retry, stok/poin atomik, dan akses API Staff.
- Frontend: 4 tes lulus, termasuk kesamaan perhitungan produk gratis/diskon/pajak dengan server.
- Browser Edge dengan fixture lokal: 20 pemeriksaan lulus tanpa page error. Mencakup member/nonmember, popup poin, Cash, QRIS, POINT, cetak otomatis/cetak ulang, scanner, label, ekspor CSV, sidebar, akses Staff, mobile, serta simulasi perintah printer/laci dan Test Print.
- Prisma schema valid; pemeriksaan branding lulus.
- Build static export web lulus, 22 halaman, untuk deployment Cloudflare Pages.

Fixture browser hanya hidup dalam memori. Tidak ada transaksi uji permanen, deployment, commit, push, atau perubahan aplikasi Android. Script browser `scripts/verify-iwear-web.cjs` memerlukan Playwright dan Edge; dijalankan di sini menggunakan runtime bawaan Codex.

Contoh hasil tampilan lokal berada di `artifacts/revision-web/`: `reward-desktop.png`, `receipt-desktop.png`, `label-desktop.png`, `staff-dashboard.png`, dan `pos-mobile.png`.

## Tindak lanjut sidebar dan role

- Header sidebar dan tampilan mobile menjadi **SISTEM KASIR / IWEARINGHIJAB**.
- Pegawai diganti Pengguna; Pelanggan diganti Member. Menu Lisensi Outlet dihapus, sementara pemeriksaan lisensi dan halaman aktivasi internal tetap berjalan.
- Staff bisa membuka Daftar Produk, Kategori, Riwayat Stok, Transaksi, Member, dan Pengaturan. Laporan, Pengeluaran, serta Pengguna tetap hanya Admin/Owner. Shift tetap mengikuti pengaturan toko.
- Staff melihat produk/kategori tanpa tombol tambah, edit, atau hapus. Admin/Owner tetap dapat mengubah harga. Akses API penulisan produk/kategori tetap dibatasi oleh backend yang sudah ada.
- URL dinormalisasi sebelum mencocokkan menu dan akses halaman: `/expenses` dan `/expenses/` menunjuk menu yang sama. Menu aktif diberi `aria-current`, dan grup inventori hanya aktif pada halaman inventori. Submenu terbuka otomatis saat masuk langsung ke halaman inventori.
- Guard halaman langsung menahan render halaman yang dilarang untuk role aktif, termasuk saat navigasi dari halaman lain.

Validasi tindak lanjut: **6 tes frontend**, **34 pemeriksaan browser pada static export**, dan **build static export 22 halaman** lulus. Pengujian memakai Admin, Owner, dan Staff, URL berakhiran slash, reload, navigasi antarmenu, back/forward, pemblokiran akses, serta mobile; tidak ada page error. Screenshot berada di `artifacts/sidebar-role/` dan pengujian dapat diulang menggunakan `scripts/verify-sidebar-static.cjs` dengan Playwright/Edge.

Perubahan sidebar ini hanya frontend; **tidak memerlukan migrasi database tambahan**. Belum di-commit, di-push, atau di-deploy oleh asisten.
