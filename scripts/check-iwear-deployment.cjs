const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const config = fs.readFileSync(path.join(root, 'pos-android/src/config/deployment.ts'), 'utf8');
const origin = config.match(/IWEAR_API_ORIGIN\s*=\s*['"]([^'"]+)['"]/)?.[1];
try {
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('Isi origin HTTPS tanpa /api, path, query, atau credential.');
  }
  if (url.hostname.endsWith('.example') || url.hostname.includes('litepos') || url.hostname.includes('lite-pos')) {
    throw new Error('Alamat Android masih sementara atau menunjuk layanan lama.');
  }
  console.log(`Origin Android: ${url.origin}`);
  console.log('Konfigurasi URL siap. Jalankan health check dan login pada deployment BARU sebelum membagikan APK.');
} catch (error) {
  console.error(`Belum siap distribusi: ${error.message}`);
  console.error('Edit pos-android/src/config/deployment.ts setelah backend Iwearing Hijab selesai deploy.');
  process.exitCode = 1;
}
