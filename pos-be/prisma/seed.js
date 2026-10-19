require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { validatePassword } = require('../src/config/auth');
const { createTrialLicenseData } = require('../src/services/licenseService');

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_OWNER_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_OWNER_PASSWORD || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Isi SEED_OWNER_EMAIL dengan email pemilik toko.');
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(`SEED_OWNER_PASSWORD: ${passwordError}`);
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const otherStore = await tx.store.findFirst({ where: { slug: { not: 'iwearing-hijab' } } });
    if (otherStore) throw new Error('Database berisi usaha lain. Gunakan database khusus Iwearing Hijab.');
    const store = await tx.store.upsert({
      where: { slug: 'iwearing-hijab' }, update: {},
      create: { slug: 'iwearing-hijab', name: 'Iwearing Hijab', type: 'RETAIL', isPublicDemo: false },
    });
    let owner = await tx.user.findUnique({ where: { email } });
    if (owner) {
      const membership = await tx.storeMembership.findUnique({ where: { userId_storeId: { userId: owner.id, storeId: store.id } } });
      if (!membership || membership.role !== 'OWNER') throw new Error('Email sudah digunakan akun lain. Seed tidak mengubah hak akses akun yang ada.');
    } else {
      owner = await tx.user.create({ data: {
        email, username: 'admin', name: 'Pemilik Iwearing Hijab', password: passwordHash,
        role: 'OWNER', isActive: true, mustChangePassword: true,
      } });
      await tx.storeMembership.create({ data: { userId: owner.id, storeId: store.id, role: 'OWNER' } });
    }
    await tx.storeSetting.upsert({
      where: { storeId: store.id }, update: {},
      create: { storeId: store.id, storeName: 'Iwearing Hijab', taxRate: 0, serviceCharge: 0,
        enableCash: true, enableQris: false, enableShift: true,
        receiptFooter: 'Terima kasih telah berbelanja di Iwearing Hijab.' },
    });
    await tx.loyaltyConfig.upsert({ where: { storeId: store.id }, update: {}, create: { storeId: store.id } });
    await tx.storeLicense.upsert({ where: { storeId: store.id }, update: {}, create: { storeId: store.id, ...createTrialLicenseData() } });
  });
  console.log('Toko Iwearing Hijab siap. Login dengan username admin atau email pemilik.');
  console.log('Tidak ada produk/transaksi contoh; password dan pengaturan yang sudah ada tidak ditimpa.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
