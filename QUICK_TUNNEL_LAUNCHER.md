# Launcher demo Cloudflare

Launcher ini menjalankan backend LitePOS dan Cloudflare Quick Tunnel sebagai proses Windows tersembunyi. Secret tetap dibaca dari `pos-be/.env` dan tidak disimpan di script.

## Menyalakan demo

1. Pada penggunaan pertama, tutup terminal backend dan `cloudflared` yang dijalankan manual agar port/tunnel tidak ganda.
2. Klik dua kali `START_LITEPOS_DEMO.cmd`.
3. Tunggu sampai muncul `Backend dan database: ONLINE` serta sebuah URL `trycloudflare.com`.
4. URL tunnel otomatis disalin ke clipboard.
5. Jika URL berubah, perbarui `API_PROXY_TARGET` pada Cloudflare Pages lalu buat deployment baru.
6. Jendela launcher boleh ditutup. Laptop dan koneksi internet harus tetap menyala serta tidak dalam kondisi sleep.

Log dan PID lokal disimpan di `.demo-runtime/`. Folder tersebut diabaikan Git.

## Mematikan demo

Klik dua kali `STOP_LITEPOS_DEMO.cmd`. Script stop hanya menghentikan proses yang sebelumnya direkam oleh launcher.

Quick Tunnel tidak menyediakan URL permanen. Setelah tunnel dihentikan atau laptop direstart, URL berikutnya kemungkinan berbeda.
