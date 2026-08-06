# Pembaruan Retail Warna Warni

Branch pembaruan ini mengambil baseline terkomit terbaru dari `AndroidPos-web`, lalu mempertahankan fitur POS yang relevan untuk toko boneka Warna Warni.

## Fitur yang dibawa

- autentikasi dan keamanan API terbaru;
- sinkronisasi Android dua arah dan perlindungan data offline;
- diskon produk, pelanggan/member, paket produk, supplier, stok, opname, serta penerimaan stok;
- transaksi pending, pembayaran manual, retur, laporan, shift, dan pengingat shift;
- katalog publik retail dengan tombol WhatsApp;
- perbaikan struk dan konfigurasi endpoint per perangkat.

## Adaptasi retail

- alur lisensi/trial dihapus;
- menu dan endpoint order meja, antrean dapur, cetak dapur, serta manajemen meja dinonaktifkan;
- kasir hanya menawarkan `Take Away` dan `Pre Order`;
- nama default aplikasi dan toko menjadi `Warna Warni`;
- endpoint Android default tetap memakai backend Warna Warni dan masih dapat diganti dari Pengaturan.

Model dan kolom database meja lama sengaja tidak dijatuhkan pada pembaruan ini. Tujuannya agar deployment ke database yang sudah pernah memakai baseline F&B tidak menghapus data secara destruktif. Aplikasi retail tidak mengekspos atau menyinkronkan fitur tersebut.

## Urutan deployment

1. Backup database dan folder upload produk.
2. Isi environment backend berdasarkan `pos-be/.env.example` dan frontend berdasarkan `pos-fe/.env.example`.
3. Jalankan `npm install` dan `npx prisma generate` di `pos-be`.
4. Tinjau perubahan schema sebelum menjalankan prosedur migrasi database yang berlaku di server produksi.
5. Jalankan test backend dan build frontend sebelum mengganti proses produksi.
6. Pasang APK baru setelah backend dan web baru aktif agar format sinkronisasi sama.

Jangan menjalankan reset data outlet sebagai bagian deployment. Reset merupakan operasi terpisah dan harus selalu didahului backup serta persetujuan eksplisit pemilik data.
