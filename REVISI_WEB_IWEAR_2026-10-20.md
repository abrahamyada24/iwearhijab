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

## Tindak lanjut Pengaturan dan Dashboard

- Tab Pembayaran dan Tentang Aplikasi dihapus untuk semua role, beserta konten tab yang tidak lagi digunakan. Pengaturan Staff tetap Tema dan Printer; tab bisnis tetap untuk Admin/Owner.
- Cash ditetapkan aktif pada form, respons pengaturan API, dan penyimpanan pengaturan, termasuk jika konfigurasi lama atau klien lama mengirim `enableCash=false`. QRIS manual dan Tukar Point tetap tersedia pada kasir.
- Pintasan dashboard Admin/Owner menjadi Kelola Produk dan Member. Ikon Total Penjualan menggunakan Rp.
- Dashboard Staff memakai dua kartu: Total Penjualan dan Transaksi Selesai. Masing-masing terbagi CASH hijau di kiri serta QRIS biru di kanan, dengan nominal/jumlah dari rekap pembayaran yang sudah ada. Gross Profit tetap disembunyikan.

Validasi: **62 tes backend**, **6 tes frontend**, **40 pemeriksaan browser static export**, dan **build static export 22 halaman** lulus. Browser memeriksa Admin/Owner/Staff, tab yang dihapus, label baru, posisi/warna dan angka setiap metode pembayaran, serta mobile tanpa overflow. Screenshot dashboard berada di `artifacts/sidebar-role/admin-dashboard.png`, `cashier-dashboard.png`, dan `staff-dashboard-mobile.png`.

Tidak memerlukan migrasi database tambahan. Perubahan masih lokal; commit, push, dan deployment belum dijalankan oleh asisten.

## Tindak lanjut Transaksi — 21 Oktober 2026

- Filter Status beserta ringkasannya dihapus dari halaman Transaksi. Kolom Status tetap tersedia dalam tabel.
- Kolom pencarian menjadi **Cari Invoice / Member...**. Backend mencari nomor invoice, nama member, ID member, serta nama member yang tersimpan ketika transaksi dibuat. Filter tanggal dan pagination tetap berlaku pada hasil pencarian.
- Kolom Tipe Pesanan dihapus; jumlah kolom untuk indikator loading dan hasil kosong ikut disesuaikan.
- Label Pelanggan pada tabel dan detail transaksi diganti **Member**.
- Tombol/kolom Pre-Order dan Jenis Transaksi tetap tidak ditampilkan. Label metode pembayaran tetap **QRIS**, termasuk untuk data lama bertipe `QRIS_MANUAL`.

Validasi: **67 tes backend**, **6 tes frontend**, **49 pemeriksaan browser static export**, dan **build static export 22 halaman** lulus. Pengujian browser memeriksa Admin/Owner/Staff, pencarian invoice/nama/ID member, hasil kosong, rentang tanggal, header tabel, detail transaksi, dan mobile tanpa overflow. Tidak ada page error. Screenshot tabel/detail tersedia di `artifacts/sidebar-role/*transactions*.png` dan `*transaction-detail*.png`.

Tidak ada perubahan schema atau migrasi database tambahan. Frontend dan backend perlu dipasang ulang agar pencarian member tersedia. Pengujian menggunakan fixture lokal tanpa mengubah data toko. Commit, push, dan deployment belum dijalankan oleh asisten.

## Tindak lanjut Laporan dan Pengeluaran — 21 Oktober 2026

- Laporan Transaksi tidak lagi memiliki kolom Tipe. Detail memakai label Member dan QRIS, termasuk pembayaran historis `QRIS_MANUAL`. Tab serta ekspor laporan pelanggan memakai nama Member.
- Detail laporan mengambil transaksi lengkap dari endpoint detail, sehingga item produk tidak bergantung pada data ringkas dari daftar transaksi. Proses pemuatan menampilkan indikator pada invoice dan kegagalan ditampilkan kepada pengguna.
- Deskripsi Pengeluaran menjadi **Pencatatan pengeluaran perusahaan**. Ringkasan hanya memiliki kartu Total; kartu Pengeluaran dan label Filtered dihapus.
- Dropdown kategori menggantikan filter tipe. Backend menerapkan kategori bersama rentang tanggal dan menghitung total berdasarkan hasil yang sama.
- Kolom Tipe dihapus dari tabel Pengeluaran. Pilihan kategori form/filter berurutan **Umum, Operasional, Konveksi, Gaji**. Backend menolak kategori Lainnya, Bahan Baku, dan Utilitas pada catatan baru. Catatan historis tetap dapat dilihat pada Semua Kategori tanpa mengubah data lama.
- Pembelian tetap tidak tersedia. Perubahan tidak memerlukan migrasi database tambahan; frontend dan backend perlu dipasang ulang bersama.

Validasi: **73 tes backend**, **7 tes frontend**, **59 pemeriksaan browser static export**, dan **build static export 22 halaman** lulus. Browser memeriksa Admin/Owner, pemuatan item melalui endpoint detail, label Member/QRIS, kolom laporan, filter kategori dan hasil kosong, total, penyimpanan pengeluaran, serta tampilan mobile. Akses Staff ke Laporan/Pengeluaran tetap diblokir; tidak ada page error. Screenshot tersedia di `artifacts/reports-expenses/`.

Pengujian memakai fixture lokal tanpa mengubah data toko. Commit, push, dan deployment belum dijalankan oleh asisten.
