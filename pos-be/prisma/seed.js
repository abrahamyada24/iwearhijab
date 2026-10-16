const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const requiredSeedPasswords = [
  ['SEED_OWNER_PASSWORD', 'owner.demo@kasirpos.local', 'Owner Demo', 'owner-demo', 'OWNER'],
  ['SEED_ADMIN_PASSWORD', 'admin.demo@kasirpos.local', 'Admin Demo', 'admin-demo', 'ADMIN'],
  ['SEED_CASHIER_PASSWORD', 'kasir.demo@kasirpos.local', 'Kasir Demo', 'kasir-demo', 'CASHIER'],
];

const addDays = (date, days) => new Date(date.getTime() + days * 86400000);

async function ensureUser([environmentKey, email, name, username, role]) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { name, username: existing.username || username, isActive: true },
    });
  }
  return prisma.user.create({
    data: {
      name,
      email,
      username,
      password: await bcrypt.hash(process.env[environmentKey], 12),
      role,
      isActive: true,
      mustChangePassword: process.env.SEED_REQUIRE_PASSWORD_CHANGE === 'true',
    },
  });
}

async function ensureCategory(storeId, name) {
  const existing = await prisma.category.findFirst({ where: { storeId, name } });
  return existing || prisma.category.create({ data: { storeId, name } });
}

async function ensureProduct(storeId, categoryId, product) {
  return prisma.product.upsert({
    where: { sku: product.sku },
    update: { ...product, storeId, categoryId },
    create: { ...product, storeId, categoryId },
  });
}

async function ensureCustomer(storeId, customer) {
  return prisma.customer.upsert({
    where: { memberId: customer.memberId },
    update: { ...customer, storeId },
    create: { ...customer, storeId },
  });
}

async function ensureStoreInfrastructure(store, settings) {
  await prisma.storeSetting.upsert({
    where: { storeId: store.id },
    update: settings,
    create: { storeId: store.id, ...settings },
  });
  await prisma.loyaltyConfig.upsert({
    where: { storeId: store.id },
    update: { isActive: true },
    create: { storeId: store.id, isActive: true },
  });
  await prisma.storeLicense.upsert({
    where: { storeId: store.id },
    update: { state: 'ACTIVE', plan: 'PREMIUM', expiresAt: addDays(new Date(), 3650) },
    create: {
      storeId: store.id,
      licenseNumber: `LP-DEMO-${store.slug.toUpperCase()}`,
      plan: 'PREMIUM',
      state: 'ACTIVE',
      expiresAt: addDays(new Date(), 3650),
      activationSource: 'DEMO_SEED',
    },
  });
}

async function ensureDemoTransaction({ storeId, userId, customer, product, invoiceNumber, workStatus }) {
  const existing = await prisma.transaction.findUnique({ where: { invoiceNumber } });
  if (existing) return existing;
  const total = Number(product.price) * 2;
  return prisma.transaction.create({
    data: {
      storeId,
      userId,
      customerId: customer.id,
      customerName: customer.name,
      invoiceNumber,
      subTotal: total,
      grandTotal: total,
      status: 'PAID',
      workStatus,
      note: 'Transaksi contoh untuk demo. Tidak terhubung ke pembayaran nyata.',
      items: {
        create: {
          productId: product.id,
          qty: 2,
          price: product.price,
          originalPrice: product.price,
          costPrice: product.costPrice,
        },
      },
      payments: {
        create: { paymentType: 'CASH', amount: total, paymentStatus: 'SETTLEMENT' },
      },
    },
  });
}

async function main() {
  const missingCredentials = requiredSeedPasswords
    .map(([environmentKey]) => environmentKey)
    .filter((environmentKey) => !process.env[environmentKey]);
  if (missingCredentials.length > 0) {
    throw new Error(`Environment seed password wajib diisi: ${missingCredentials.join(', ')}`);
  }

  const laundry = await prisma.store.upsert({
    where: { slug: 'laundry-demo' },
    update: { name: 'Laundry Ceria', type: 'LAUNDRY', isActive: true, isPublicDemo: true },
    create: { slug: 'laundry-demo', name: 'Laundry Ceria', type: 'LAUNDRY', isPublicDemo: true },
  });
  const clothing = await prisma.store.upsert({
    where: { slug: 'toko-pakaian-demo' },
    update: { name: 'Toko Pakaian Warna Warni', type: 'RETAIL', isActive: true, isPublicDemo: true },
    create: { slug: 'toko-pakaian-demo', name: 'Toko Pakaian Warna Warni', type: 'RETAIL', isPublicDemo: true },
  });

  const users = [];
  for (const credential of requiredSeedPasswords) users.push(await ensureUser(credential));
  for (const store of [laundry, clothing]) {
    for (let index = 0; index < users.length; index += 1) {
      await prisma.storeMembership.upsert({
        where: { userId_storeId: { userId: users[index].id, storeId: store.id } },
        update: { role: requiredSeedPasswords[index][4], isActive: true },
        create: { userId: users[index].id, storeId: store.id, role: requiredSeedPasswords[index][4] },
      });
    }
  }

  await ensureStoreInfrastructure(laundry, {
    storeName: 'Laundry Ceria', address: 'Jl. Contoh No. 10', phone: '0812-0000-1001',
    enableCash: true, enableQris: false, enableDebit: false, enableShift: false,
    receiptFooter: 'Demo Laundry Ceria - bukan transaksi sungguhan',
  });
  await ensureStoreInfrastructure(clothing, {
    storeName: 'Toko Pakaian Warna Warni', address: 'Jl. Contoh No. 20', phone: '0812-0000-2002',
    enableCash: true, enableQris: false, enableDebit: false, enableShift: false,
    receiptFooter: 'Demo Toko Pakaian - bukan transaksi sungguhan',
  });

  const kiloan = await ensureCategory(laundry.id, 'Laundry Kiloan');
  const satuan = await ensureCategory(laundry.id, 'Laundry Satuan');
  const laundryProducts = [
    await ensureProduct(laundry.id, kiloan.id, { sku: 'LND-CUCI-KERING-KG', name: 'Cuci Kering', price: 7000, costPrice: 3000, stock: 0, minStock: 0, isActive: true, isUnlimitedStock: true, unitLabel: 'kg' }),
    await ensureProduct(laundry.id, kiloan.id, { sku: 'LND-CUCI-SETRIKA-KG', name: 'Cuci + Setrika', price: 10000, costPrice: 4000, stock: 0, minStock: 0, isActive: true, isUnlimitedStock: true, unitLabel: 'kg' }),
    await ensureProduct(laundry.id, satuan.id, { sku: 'LND-BEDCOVER-PCS', name: 'Bed Cover', price: 25000, costPrice: 10000, stock: 0, minStock: 0, isActive: true, isUnlimitedStock: true, unitLabel: 'pcs' }),
  ];

  const atasan = await ensureCategory(clothing.id, 'Atasan');
  const bawahan = await ensureCategory(clothing.id, 'Bawahan');
  const aksesori = await ensureCategory(clothing.id, 'Aksesori');
  const clothingProducts = [
    await ensureProduct(clothing.id, atasan.id, { sku: 'FAS-TSHIRT-BLK-S', name: 'T-Shirt Basic - Hitam / S', price: 99000, costPrice: 55000, stock: 12, minStock: 3, isActive: true, isUnlimitedStock: false, unitLabel: 'pcs' }),
    await ensureProduct(clothing.id, atasan.id, { sku: 'FAS-TSHIRT-BLK-M', name: 'T-Shirt Basic - Hitam / M', price: 99000, costPrice: 55000, stock: 9, minStock: 3, isActive: true, isUnlimitedStock: false, unitLabel: 'pcs' }),
    await ensureProduct(clothing.id, atasan.id, { sku: 'FAS-TSHIRT-WHT-L', name: 'T-Shirt Basic - Putih / L', price: 99000, costPrice: 55000, stock: 7, minStock: 3, isActive: true, isUnlimitedStock: false, unitLabel: 'pcs' }),
    await ensureProduct(clothing.id, bawahan.id, { sku: 'FAS-JEANS-BLU-30', name: 'Jeans Slim - Biru / 30', price: 249000, costPrice: 145000, stock: 6, minStock: 2, isActive: true, isUnlimitedStock: false, unitLabel: 'pcs' }),
    await ensureProduct(clothing.id, aksesori.id, { sku: 'FAS-TOTEBAG-NAT', name: 'Tote Bag - Natural', price: 59000, costPrice: 28000, stock: 15, minStock: 4, isActive: true, isUnlimitedStock: false, unitLabel: 'pcs' }),
  ];

  const laundryCustomer = await ensureCustomer(laundry.id, { memberId: 'LND-DEMO-001', name: 'Dewi Pelanggan Laundry', phone: '081200001001', email: 'dewi.laundry@example.test', points: 20 });
  const clothingCustomer = await ensureCustomer(clothing.id, { memberId: 'FAS-DEMO-001', name: 'Raka Pelanggan Toko', phone: '081200002002', email: 'raka.fashion@example.test', points: 10 });

  await ensureDemoTransaction({ storeId: laundry.id, userId: users[2].id, customer: laundryCustomer, product: laundryProducts[1], invoiceNumber: 'DEMO-LAUNDRY-001', workStatus: 'PROCESSING' });
  await ensureDemoTransaction({ storeId: clothing.id, userId: users[2].id, customer: clothingCustomer, product: clothingProducts[0], invoiceNumber: 'DEMO-FASHION-001', workStatus: null });

  console.log('Seed demo selesai: Laundry Ceria dan Toko Pakaian Warna Warni.');
  console.log('Pembayaran gateway dinonaktifkan; seluruh data transaksi adalah dummy.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
