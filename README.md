# LitePOS Demo — Panduan Pengguna

LitePOS adalah aplikasi kasir untuk membantu mengelola produk, stok, pelanggan, pegawai, dan transaksi dalam satu tempat. Demo tersedia dalam dua bentuk:

- **Website**, untuk mendaftarkan usaha dan mengelola operasional dari browser.
- **Aplikasi Android**, untuk menjalankan kasir dari ponsel atau tablet.

> **Penting:** ini adalah lingkungan demo. Jangan masukkan data pelanggan asli, informasi keuangan rahasia, atau password yang juga dipakai di akun lain. Data demo dapat dibersihkan sewaktu-waktu.

## 1. Mencoba LitePOS melalui website

### Alamat website

- Buka [LitePOS Demo](https://litepos-demo.pages.dev/)
- Jika belum mempunyai akun, buka [Pendaftaran Usaha](https://litepos-demo.pages.dev/register/)

Website dapat dibuka melalui Chrome, Edge, Firefox, atau Safari. Untuk tampilan terbaik, gunakan browser versi terbaru dan pastikan perangkat terhubung ke internet.

### Membuat akun dan usaha baru

1. Buka halaman **Pendaftaran Usaha**.
2. Isi **Nama usaha**.
3. Pilih jenis usaha:
   - **Retail** untuk toko pakaian, toko kelontong, toko aksesoris, dan usaha penjualan barang lainnya.
   - **F&B** untuk warung, kafe, restoran, dan usaha makanan atau minuman.
4. Isi **Nama Owner** dan **Email Owner**.
5. Isi **Nama pengguna** jika diinginkan. Kolom ini boleh dikosongkan; sistem akan membuatkannya secara otomatis.
6. Buat password minimal 12 karakter, lalu ketik ulang password yang sama.
7. Tekan **Buat Usaha**.

Akun pertama yang dibuat otomatis menjadi **Owner**. Setiap usaha mempunyai ruang data sendiri, sehingga produk, stok, pelanggan, pegawai, dan transaksi tidak tercampur dengan usaha lain.

> Simpan nama pengguna/email dan password Anda. Gunakan akun yang sama untuk masuk melalui website maupun aplikasi Android.

### Jika sudah diberi akun demo

Masuk menggunakan username/email dan password yang diberikan oleh pengelola demo. Demi keamanan, password akun demo tidak ditulis di repositori ini.

### Pengaturan awal yang disarankan

Setelah berhasil masuk, lakukan pengaturan secara berurutan:

1. Periksa nama dan informasi usaha di menu **Pengaturan**.
2. Buat **Kategori**.
3. Tambahkan **Produk/Menu** beserta harga dan stoknya.
4. Tambahkan **Pelanggan** jika diperlukan.
5. Owner atau Admin dapat membuat akun **Pegawai**.
6. Buka shift kasir jika fitur shift digunakan.
7. Coba membuat transaksi dari menu **POS/Kasir**.
8. Periksa hasilnya di menu **Transaksi** dan **Laporan**.

### Peran pengguna

- **Owner**: pemilik usaha dengan akses paling lengkap, termasuk mengelola pegawai.
- **Admin**: membantu mengelola operasional usaha sesuai akses yang diberikan.
- **Kasir**: menggunakan fitur kasir dan transaksi harian.

Pengguna biasa langsung masuk ke usaha tempat akunnya terdaftar. Tidak perlu memilih usaha dari daftar setelah login.

## 2. Memasang aplikasi LitePOS di Android

### Persyaratan

- Ponsel atau tablet dengan **Android 7.0 atau lebih baru**.
- Koneksi internet aktif.
- Akun LitePOS yang sudah dibuat melalui website atau diberikan oleh pengelola demo.
- File **APK release** dari tautan Google Drive resmi pengelola demo.

> **Tautan unduhan APK:** akan dibagikan oleh pengelola demo melalui Google Drive.

Gunakan hanya file APK dari tautan yang diberikan langsung oleh pengelola LitePOS. Jangan memasang APK dari sumber yang tidak dikenal.

### Cara mengunduh dan memasang APK

1. Buka tautan Google Drive dari ponsel Android.
2. Tekan tombol **Download/Unduh**.
3. Jika Google Drive menampilkan peringatan bahwa file APK dapat berbahaya, lanjutkan hanya jika tautannya benar-benar berasal dari pengelola LitePOS.
4. Setelah selesai diunduh, buka file APK dari notifikasi unduhan atau aplikasi **File/Files**.
5. Jika pemasangan diblokir, tekan **Setelan/Settings** pada pesan yang muncul.
6. Aktifkan sementara izin **Instal aplikasi tidak dikenal** untuk aplikasi yang digunakan membuka APK, misalnya Google Drive, Chrome, atau Files.
7. Kembali ke halaman pemasangan, lalu tekan **Instal**.
8. Setelah selesai, tekan **Buka**. Nama aplikasi yang tampil adalah **LitePOS Demo**.
9. Demi keamanan, matikan kembali izin **Instal aplikasi tidak dikenal** yang tadi diaktifkan.

Nama menu dapat sedikit berbeda pada setiap merek ponsel. Biasanya pengaturannya berada di:

`Setelan > Keamanan/Privasi > Instal aplikasi tidak dikenal`

Tidak perlu mematikan Google Play Protect secara keseluruhan. Jika muncul peringatan keamanan, pastikan kembali bahwa APK berasal dari tautan resmi sebelum melanjutkan.

### Masuk ke aplikasi Android

1. Pastikan internet aktif.
2. Buka aplikasi **LitePOS Demo**.
3. Masukkan username/email dan password yang sama dengan akun website.
4. Tekan **Masuk**.

Pendaftaran usaha baru hanya tersedia melalui website. Setelah usaha berhasil dibuat, akun tersebut dapat langsung digunakan di aplikasi Android.

### Memperbarui aplikasi Android

Jika pengelola membagikan versi APK yang lebih baru:

1. Unduh APK baru dari tautan resmi.
2. Buka file tersebut dan tekan **Perbarui/Update**.
3. Tidak perlu menghapus aplikasi lama terlebih dahulu.

Rilis resmi **LitePOS Demo 1.4.2** memakai identitas aplikasi baru sehingga dapat dipasang tanpa berbenturan dengan APK uji lama **LitePOS Warna Warni**. Setelah LitePOS Demo berhasil dipasang dan login, aplikasi lama boleh dihapus agar tidak membingungkan pengguna.

Setelah versi 1.4.2 terpasang, pembaruan berikutnya tidak perlu menghapus aplikasi selama pengelola selalu menggunakan identitas dan kunci rilis yang sama. Jika Android meminta aplikasi dihapus pada versi berikutnya, jangan lanjutkan dahulu dan hubungi pengelola.

## 3. Hal penting saat menggunakan demo

- Website dan aplikasi Android **memerlukan internet**. Versi demo belum menyediakan transaksi offline.
- Jika internet terputus, Android akan menampilkan peringatan. Sambungkan kembali internet lalu tekan **Coba Lagi**.
- Pembayaran di demo bersifat pencatatan/manual. **Tidak ada pembayaran sungguhan atau pemotongan saldo otomatis.**
- QRIS Manual dan Transfer hanya mencatat metode pembayaran yang dipilih; pastikan tidak mengirim uang sungguhan untuk mencoba demo.
- Data setiap usaha dipisahkan. Pegawai yang dibuat oleh suatu Owner hanya dapat mengakses usaha tersebut.
- Masa percobaan untuk usaha yang mendaftar sendiri adalah **14 hari**.
- Demo tidak ditujukan sebagai penyimpanan data produksi dan dapat mengalami perubahan atau pembersihan data tanpa pemberitahuan.

## 4. Solusi masalah umum

### Website tidak terbuka atau terus memuat

1. Periksa koneksi internet.
2. Muat ulang halaman.
3. Coba buka melalui mode Samaran/Incognito atau browser lain.
4. Tunggu beberapa saat lalu coba kembali; layanan demo gratis kadang memerlukan waktu untuk aktif setelah lama tidak digunakan.

### Tidak bisa login

1. Pastikan username/email ditulis dengan benar.
2. Pastikan huruf besar, huruf kecil, dan simbol pada password sudah sesuai.
3. Coba login di website untuk memastikan akun aktif.
4. Jika tetap gagal, hubungi pengelola demo. Jangan mengirim password melalui ruang publik.

### Android menampilkan “Tidak Ada Koneksi”

1. Pastikan Wi-Fi atau data seluler aktif.
2. Coba buka [LitePOS Demo](https://litepos-demo.pages.dev/) melalui browser di perangkat yang sama.
3. Matikan sementara VPN atau penghemat data jika koneksi aplikasi dibatasi.
4. Kembali ke aplikasi lalu tekan **Coba Lagi**.

### APK tidak dapat dipasang

1. Pastikan perangkat menggunakan Android 7.0 atau lebih baru.
2. Pastikan ruang penyimpanan masih cukup.
3. Periksa izin **Instal aplikasi tidak dikenal** untuk Drive, Chrome, atau Files.
4. Unduh ulang APK jika file rusak atau unduhan terhenti.
5. Jika pesan menyebut aplikasi tidak kompatibel atau tanda tangan berbeda, kirim tangkapan layar pesan tersebut kepada pengelola.

### Data atau menu usaha lain terlihat

Keluar dari akun dan jangan mengubah data tersebut. Ambil tangkapan layar tanpa menampilkan password, lalu segera laporkan kepada pengelola demo agar akses dapat diperiksa.

## 5. Bantuan

Saat melaporkan masalah, sertakan:

- Perangkat yang digunakan, misalnya “Samsung A14, Android 14”.
- Apakah masalah terjadi di website atau Android.
- Langkah yang dilakukan sebelum masalah muncul.
- Tangkapan layar pesan error jika ada.

Jangan pernah menyertakan password, token, atau data pribadi pelanggan dalam laporan masalah.

---

LitePOS Demo dibuat untuk mencoba alur aplikasi sebelum digunakan pada lingkungan produksi. Gunakan data contoh dan nikmati eksplorasinya.
