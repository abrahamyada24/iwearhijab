# Penyesuaian Android Iwearing Hijab — 22 Oktober 2026

Android mengikuti revisi web 20–21 Oktober 2026. Versi native: **1.5.0**, `versionCode 12`, identitas tetap `com.iwear.app`.

## Perubahan

- Ikon launcher biasa/bulat/adaptive memakai monogram dari `logo web.PNG`, putih di atas rose `#A8747A`. Login, navigasi, tombol, dan dialog memakai palet rose yang sama dengan login web. Warna status tetap memiliki arti masing-masing; Cash hijau dan QRIS biru pada dashboard Staff.
- Favicon SVG dan Apple touch icon web memakai monogram yang sama. Generator yang dapat dijalankan ulang: `powershell -File scripts/generate-iwear-icons.ps1`. File logo sumber tetap dipertahankan.
- URL API dipasang ke **https://iwearhijab.vercel.app/api**, sesuai alamat yang diberikan pengguna. Pemeriksaan GET `/api/health` mengembalikan HTTP 200, `server: ONLINE`, `database: CONNECTED`. Tidak ada login atau transaksi yang dibuat pada server produksi untuk pengujian.
- Navigasi utama: Beranda, Produk, Transaksi, Member, Pengaturan. Daftar produk/kategori dan riwayat stok dapat dibuka Staff. Penulisan produk/kategori, Laporan, Pengeluaran, serta Pengguna khusus Admin/Owner; retur transaksi khusus Owner. Guard rute memblokir rute yang tidak dikenal dan rute lama.
- Paket, Supplier, Penerimaan Barang, Stock Opname, fitur meja/dapur, preorder, Transfer, serta Pembelian tidak dimuat oleh navigasi baru. Menu Lisensi, Pembayaran, dan Tentang Aplikasi tidak ditampilkan. Pemeriksaan lisensi dan aktivasi saat akun terkunci tetap berlaku.
- Data operasional memakai endpoint web: produk, kategori, member, stok, dashboard, transaksi, laporan, pengeluaran, pengaturan, pengguna, dan shift. Tidak ada penulisan transaksi baru melalui bulk sync/cache lokal. Bootstrap diperbarui berkala dan saat aplikasi aktif kembali; sesi kedaluwarsa dibersihkan.
- Dashboard Staff menampilkan nominal/jumlah Cash dan QRIS untuk hari berjalan dari rekap Jakarta. Admin/Owner mendapat rekap bulanan, laba, pajak/diskon, pengeluaran, tren, produk terlaris, serta pintasan Produk dan Member, tanpa kartu stok.
- Produk memiliki Varian/Warna, barcode/SKU, harga/HPP, stok, gambar, serta pengaturan diskon. Label QR berisi identitas produk dan harga, dapat dicetak 58 mm atau disimpan sebagai PNG. Kasir mendukung pencarian varian/warna serta scanner kamera dan barcode/SKU dari input.
- Checkout memakai Cash atau QRIS yang dikonfirmasi kasir. Member dapat menukar sebagian poin untuk jumlah produk yang dipilih. Diskon tambahan dihitung setelah produk gratis, lalu pajak. Sisa nol akibat penukaran dicatat sebagai POINT. Server memvalidasi harga, stok dan poin; struk menggunakan total/snapshot poin respons server.
- Permintaan checkout disimpan sebelum dikirim, dipisahkan per akun/toko, dengan idempotency key. Timeout/restart tetap menggunakan payload dan key yang sama. Beranda menyediakan **Lanjutkan Transaksi Sebelumnya**; transaksi baru ditahan sampai permintaan lama jelas hasilnya.
- Transaksi menggunakan pencarian invoice/member, rentang tanggal dan pagination, tanpa filter status/tipe. Detail diambil kembali dari endpoint transaksi lengkap. QRIS_MANUAL historis ditampilkan sebagai QRIS.
- Pengeluaran memakai kategori **Umum, Operasional, Konveksi, Gaji** dan satu kartu Total; filter kategori/tanggal diterapkan server. Kategori historis tetap terbaca pada Semua Kategori.
- Laporan menyediakan transaksi, kategori, Member, laba rugi, dan 20 shift terbaru; ekspor CSV/PDF memakai dialog simpan Android. Laporan shift adalah daftar terbaru dari endpoint yang tersedia, bukan laporan rentang tanggal.
- Pengaturan Staff terbatas Tema/Printer. Admin/Owner mendapat profil toko, logo, operasional/shift, loyalitas, serta Pengguna. Bluetooth dan USB OTG dipertahankan. Nilai poin historis yang masih wajib pada kontrak API loyalitas dipertahankan ketika menyimpan pengaturan.
- Struk dicetak sebagai gambar dengan font sans-serif agar preview/hasil cetak konsisten. Tidak menampilkan jenis pesanan; Member hanya tampil untuk transaksi member. Tersedia cetak ulang, unduh PNG, dan bagikan. Cetak otomatis dipanggil sekali setelah checkout; pulsa laci hanya pada cetak otomatis pertama untuk Cash dengan kembalian. Cetak ulang, uang pas, QRIS, POINT, test print dan label tidak membuka laci.

## Validasi

- TypeScript `tsc --noEmit --incremental false`: lulus.
- Jest: **29 tes / 8 suite lulus**, meliputi role/guard navigasi, tampilan Staff, kategori pengeluaran, pencarian/detail transaksi, perhitungan penukaran dengan fungsi backend yang sama, dan pemulihan checkout setelah timeout/restart.
- ESLint pada layar retail baru, root aplikasi, login, dan tema: lulus tanpa error/warning.
- Metro bundle produksi Android: lulus, termasuk QR dan aset monogram.
- Native `:app:assembleDebug -PreactNativeArchitectures=arm64-v8a`: **BUILD SUCCESSFUL**. APK debug di `pos-android/android/app/build/outputs/apk/debug/app-debug.apk` adalah build pengembangan yang memerlukan Metro; bukan APK release untuk distribusi.
- Build static export web: lulus; metadata hasil login memiliki link favicon SVG dan Apple icon baru.
- Pemeriksaan branding serta konfigurasi deployment: lulus.

Tidak ada HP/emulator terhubung. Login end-to-end dengan akun toko, scan kamera nyata, hasil cetak Bluetooth/USB, mekanisme laci, dan dialog simpan pada HP belum diverifikasi. Library printer mengantrekan perintah native; keberhasilan build/tes bukan pengakuan perangkat fisik bahwa kertas atau laci sudah bergerak.

Tidak ada perubahan schema/migrasi baru, deploy, commit, atau push pada pekerjaan ini. Server tujuan harus memuat revisi backend yang sama. Modul layar/cache lama tetap berada di sumber sebagai referensi, tetapi tidak diimpor oleh navigasi retail baru. Rilis resmi tetap memakai signing key toko yang sudah ada; debug key tidak menggantikannya.
