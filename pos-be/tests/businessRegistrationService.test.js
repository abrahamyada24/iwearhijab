const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateAvailableStoreSlug,
  normalizeStoreSlug,
  validateStoreSlug,
} = require('../src/services/businessRegistrationService');

test('slug usaha dinormalisasi untuk URL', () => {
  assert.equal(normalizeStoreSlug('  Laundry Ceria & Bersih  '), 'laundry-ceria-bersih');
  assert.equal(normalizeStoreSlug('Toko Pakaian Élite'), 'toko-pakaian-elite');
});

test('slug pendek dan slug sistem ditolak', () => {
  assert.match(validateStoreSlug('ab'), /minimal 3/);
  assert.match(validateStoreSlug('api'), /tidak dapat digunakan/);
  assert.equal(validateStoreSlug('usaha-baru'), null);
});

test('slug otomatis mendapat suffix ketika sudah digunakan', async () => {
  const used = new Set(['toko-maju', 'toko-maju-2']);
  const prisma = {
    store: {
      findUnique: async ({ where }) => used.has(where.slug) ? { id: 1 } : null,
    },
  };
  assert.equal(await generateAvailableStoreSlug(prisma, 'Toko Maju'), 'toko-maju-3');
});
