const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const marker = path.join(root, '.demo-runtime', 'iwear-local-configured');
if (fs.existsSync(marker)) {
  console.log('Environment Iwearing Hijab sudah disiapkan. Tidak ada file yang ditimpa.');
  process.exit(0);
}

const backup = path.join(root, '.demo-runtime', `original-env-${Date.now()}`);
fs.mkdirSync(backup, { recursive: true });
const secret = () => crypto.randomBytes(32).toString('hex');
const environments = {
  'pos-fe': [
    '# Iwearing Hijab lokal. /api diteruskan ke backend lokal oleh Next.js.',
    'NEXT_PUBLIC_API_URL=',
    'API_PROXY_TARGET=http://127.0.0.1:5200',
    'STATIC_EXPORT=false',
  ].join('\n') + '\n',
  'pos-be': [
    '# Iwearing Hijab lokal. Isi koneksi database BARU sebelum menjalankan backend.',
    'NODE_ENV=development', 'HOST=127.0.0.1', 'PORT=5200',
    'DATABASE_URL="mysql://iwear_local:CHANGE_ME@127.0.0.1:3306/iwear"',
    `JWT_SECRET=${secret()}`, `LICENSE_CODE_SECRET=${secret()}`,
    `PLATFORM_ADMIN_JWT_SECRET=${secret()}`,
    'CORS_ORIGINS=http://localhost:3200,http://127.0.0.1:3200',
    'CLOUDINARY_CLOUD_NAME=', 'CLOUDINARY_API_KEY=', 'CLOUDINARY_API_SECRET=',
    'PUBLIC_BUSINESS_REGISTRATION=false', 'SEED_OWNER_EMAIL=', 'SEED_OWNER_PASSWORD=', 'CLOUDINARY_FOLDER=iwear', 'MIDTRANS_IS_PRODUCTION=false',
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
