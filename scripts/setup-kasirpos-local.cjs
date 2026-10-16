const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const marker = path.join(root, '.demo-runtime', 'kasirpos-local-configured');
if (fs.existsSync(marker)) {
  console.log('Environment KasirPOS sudah disiapkan. Tidak ada file yang ditimpa.');
  process.exit(0);
}

const backup = path.join(root, '.demo-runtime', `original-env-${Date.now()}`);
fs.mkdirSync(backup, { recursive: true });
const secret = () => crypto.randomBytes(32).toString('hex');
const environments = {
  'pos-fe': [
    '# KasirPOS lokal. /api diteruskan ke backend lokal oleh Next.js.',
    'NEXT_PUBLIC_API_URL=',
    'API_PROXY_TARGET=http://127.0.0.1:5100',
    'STATIC_EXPORT=false',
  ].join('\n') + '\n',
  'pos-be': [
    '# KasirPOS lokal. Isi koneksi database BARU sebelum menjalankan backend.',
    'NODE_ENV=development', 'HOST=127.0.0.1', 'PORT=5100',
    'DATABASE_URL="mysql://kasirpos_local:CHANGE_ME@127.0.0.1:3306/kasirpos"',
    `JWT_SECRET=${secret()}`, `LICENSE_CODE_SECRET=${secret()}`,
    `PLATFORM_ADMIN_JWT_SECRET=${secret()}`,
    'CORS_ORIGINS=http://localhost:3100,http://127.0.0.1:3100',
    'CLOUDINARY_CLOUD_NAME=', 'CLOUDINARY_API_KEY=', 'CLOUDINARY_API_SECRET=',
    'CLOUDINARY_FOLDER=kasirpos', 'MIDTRANS_IS_PRODUCTION=false',
    'MIDTRANS_SERVER_KEY=', 'MIDTRANS_CLIENT_KEY=',
    'SMTP_HOST=', 'SMTP_PORT=587', 'SMTP_USER=', 'SMTP_PASS=', 'SMTP_FROM=',
  ].join('\n') + '\n',
};

for (const [component, contents] of Object.entries(environments)) {
  const directory = path.join(root, component);
  const existing = fs.readdirSync(directory).filter(name => (
    (name === '.env' || name.startsWith('.env.'))
    && name !== '.env.example'
    && fs.statSync(path.join(directory, name)).isFile()
  ));
  for (const name of existing) {
    fs.copyFileSync(path.join(directory, name), path.join(backup, `${component}-${name}`));
    fs.writeFileSync(path.join(directory, name), contents);
  }
  fs.writeFileSync(path.join(directory, '.env'), contents);
}
fs.writeFileSync(marker, new Date().toISOString());
console.log('Environment lokal dipisahkan. Koneksi lama tidak dipakai.');
console.log(`Salinan konfigurasi sebelumnya tersimpan lokal di ${path.relative(root, backup)} (diabaikan Git).`);
console.log('Belum ada koneksi atau perubahan ke database maupun hosting.');
