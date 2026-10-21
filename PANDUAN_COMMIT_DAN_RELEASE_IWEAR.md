# Commit/push GitHub dan build release Android

Panduan untuk PowerShell di komputer ini, proyek `D:\iwear`. Remote tujuan **origin** adalah `https://github.com/abrahamyada24/iwearhijab.git`, branch **main**. Remote `upstream` merupakan repositori lain dan tidak dipakai dalam langkah ini.

## 1. Commit dan push perubahan

Jalankan sendiri dari PowerShell:

```powershell
Set-Location D:\iwear
git status --short
git diff --check
git add -- .gitignore pos-android pos-fe/src/app/icon.svg pos-fe/src/app/apple-icon.png pos-fe/public/branding/app-icon.png "logo web.PNG" scripts/generate-iwear-icons.ps1 PENYESUAIAN_ANDROID_2026-10-22.md PANDUAN_COMMIT_DAN_RELEASE_IWEAR.md
git diff --cached --stat
git diff --cached --name-only
git commit -m "feat: align Android retail with web and refresh Iwear branding"
git push origin main
git status -sb
git log -1 --oneline
```

Periksa daftar staged sebelum `git commit`. Perubahan Android, ikon web, sumber logo, generator dan panduan ikut masuk. `node_modules`, cache/build, APK, `.env`, `keystore.properties`, serta keystore privat diabaikan Git. `debug.keystore` bawaan sudah ada dalam repository; bukan key untuk release toko. Jangan menambahkan file yang diabaikan dengan `git add -f`.

Jika push ditolak karena remote lebih baru, jalankan `git fetch origin`, lalu periksa `git log --oneline --left-right main...origin/main`. Jangan force push. Bila perlu rebase setelah perubahan lokal sudah di-commit, gunakan `git pull --rebase origin main`; selesaikan konflik sebelum push lagi.

Commit/push tidak menerapkan migrasi database. Push dapat memicu deploy web jika GitHub/Vercel sudah dikonfigurasi untuk deploy otomatis. Panduan ini tidak mengubah konfigurasi deployment tersebut.

## 2. Prasyarat Android

- Node.js minimal 22.11; pemeriksaan terakhir memakai Node 24.15.0 dan npm 11.12.1.
- Android Studio/JDK, Android SDK platform/build-tools 35, NDK 27.1.12297006. Gunakan Gradle wrapper bawaan proyek.
- Di komputer ini `android/gradle.properties` memakai JDK Android Studio di `C:/Program Files/Android/Android Studio/jbr`. Sesuaikan `org.gradle.java.home` bila lokasinya berbeda pada komputer lain.
- `pos-android/android/local.properties` berisi `sdk.dir=C:/Users/LENOVO/AppData/Local/Android/Sdk` pada komputer ini; file lokal ini tidak masuk Git.
- API Android sudah diatur ke `https://iwearhijab.vercel.app/api`, versi native **1.5.0**, `versionCode 12`, application ID `com.iwear.app`.

Untuk instalasi dependensi yang dapat diulang:

```powershell
Set-Location D:\iwear\pos-android
npm.cmd ci --legacy-peer-deps
```

Flag `--legacy-peer-deps` diperlukan oleh kombinasi peer dependency printer/ping lama pada proyek ini. Pertahankan `package-lock.json` dan patch yang diterapkan oleh postinstall.

## 3. Siapkan signing key secara lokal

**Jika toko sudah memiliki APK release sebelumnya, gunakan keystore, alias dan password yang sama.** Jangan membuat key pengganti hanya untuk update. Signature dan application ID harus cocok agar APK bisa memperbarui instalasi lama. Naikkan `versionCode` jika APK yang terpasang sudah memakai nilai 12 atau lebih.

Simpan keystore misalnya di `D:\iwear\pos-android\android\app\iwear-release.keystore`. Kemudian:

```powershell
Set-Location D:\iwear
Copy-Item -LiteralPath .\pos-android\android\keystore.properties.example -Destination .\pos-android\android\keystore.properties
```

Jalankan `Copy-Item` hanya jika `keystore.properties` belum ada agar konfigurasi lokal sebelumnya tidak tertimpa. Buka file lokal tersebut di editor dan isi:

```properties
storeFile=iwear-release.keystore
storePassword=ISI_PASSWORD_KEYSTORE
keyAlias=iwear
keyPassword=ISI_PASSWORD_KEY
```

`storeFile` relatif terhadap folder **android/app**. Jika memakai lokasi lain, gunakan path absolut dengan slash `/`, misalnya `D:/Kunci-Iwear/iwear-release.keystore`. Sesuaikan nama/alias dengan key lama. Jangan menempelkan password di chat atau command Git. Format Java properties memperlakukan backslash sebagai escape; gunakan `/` pada path dan escape backslash dalam password jika ada.

**Hanya untuk rilis pertama yang benar-benar belum punya signing key**, buat key baru secara interaktif:

```powershell
Set-Location D:\iwear
keytool -genkeypair -v -storetype PKCS12 -keystore .\pos-android\android\app\iwear-release.keystore -alias iwear -keyalg RSA -keysize 2048 -validity 10000
```

Perintah meminta password tanpa menaruhnya di command history. Untuk PKCS12 baru, isi `keyPassword` sama dengan `storePassword`. Backup file keystore, alias dan password secara terpisah di tempat aman. Jangan menjalankan perintah pembuatan key terhadap key lama.

## 4. Pemeriksaan sebelum build

```powershell
Set-Location D:\iwear
npm.cmd run check:branding
npm.cmd run check:deployment
Set-Location .\pos-android
.\node_modules\.bin\tsc.cmd --noEmit --incremental false
npm.cmd test -- --runInBand
Set-Location .\android
.\gradlew.bat :app:validateReleaseSigning --console=plain
```

Jangan lanjut jika salah satu perintah gagal. Task signing memeriksa file/field konfigurasi, menolak debug key, serta membuka key menggunakan alias/password yang kamu isi tanpa menampilkannya. Keberhasilan pemeriksaan ini belum membandingkan sertifikat dengan APK toko sebelumnya; jika sudah pernah merilis, tetap gunakan key yang sama.

## 5. Build APK release sendiri

Untuk HP Android ARM64, jalankan dari folder `D:\iwear\pos-android\android`:

```powershell
.\gradlew.bat :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain --max-workers=2
```

Hasil setelah **BUILD SUCCESSFUL**:

```text
D:\iwear\pos-android\android\app\build\outputs\apk\release\app-release.apk
```

Ini APK bertanda tangan untuk instalasi langsung. Bundle JavaScript, Hermes dan gambar ikut dipaketkan oleh Gradle, sehingga tidak perlu menjalankan Metro dan tidak perlu membuat bundle manual di `src/main/assets`.

Untuk APK universal sesuai arsitektur default proyek, hilangkan `-PreactNativeArchitectures=arm64-v8a`; prosesnya lebih lama dan hasil lebih besar. Validasi native yang sudah dilakukan sebelumnya adalah ARM64. Untuk kebutuhan Play Store, task AAB adalah `:app:bundleRelease` dengan output `app/build/outputs/bundle/release/app-release.aab`; panduan ini berfokus pada APK instalasi langsung, bukan memastikan persyaratan publikasi Play Store.

Periksa signature hasil APK di komputer ini:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\build-tools\35.0.0\apksigner.bat" verify --verbose --print-certs .\app\build\outputs\apk\release\app-release.apk
```

Sesuaikan lokasi SDK jika berbeda. Jangan membagikan output lama hanya karena file APK sudah ada; pastikan proses build terbaru selesai sukses.

## 6. Coba di HP sebelum dibagikan

Pasang APK release yang baru, tutup Metro, lalu buka aplikasi. Cek login, logo/warna, role Staff/Admin/Owner, stok dan harga, transaksi Cash/QRIS, penukaran poin, struk, scanner, serta printer Bluetooth/USB. Uji transaksi pada akun/toko uji; jangan membuat transaksi palsu pada data toko nyata. Pulsa laci bergantung pada printer dan koneksi fisik.

Jika pemasangan ditolak karena signature berbeda, bandingkan signing key APK lama dan baru terlebih dahulu. Menghapus aplikasi bukan bagian dari proses update biasa dan dapat menghapus data lokal.

## Status pemeriksaan

Validasi sebelumnya: **29 tes**, TypeScript, lint, bundle Metro, build native debug ARM64, serta build static export web lulus. File signing release lokal belum tersedia saat panduan dibuat. Karena itu APK release bertanda tangan dan login/perangkat fisik belum dinyatakan lulus. Commit, push, pembuatan signing key, dan build APK release akhir tetap dilakukan pengguna.

Referensi: [React Native — signed Android builds](https://reactnative.dev/docs/signed-apk-android), [Android — app signing](https://developer.android.com/studio/publish/app-signing).
