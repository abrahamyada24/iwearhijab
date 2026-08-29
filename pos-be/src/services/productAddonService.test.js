const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeAddonIds,
  normalizeAddonSelections,
  resolveSelectedAddons,
  buildAddonItemNotes,
  calculateAddonAwareLinePricing,
} = require('./productAddonService');

test('normalizeAddonIds hanya menerima ID positif dan unik', () => {
  assert.deepEqual(normalizeAddonIds(['2', 2, 1, 0, 'abc', null]), [2, 1]);
});

test('normalizeAddonSelections mendukung format lama dan menggabungkan jumlah', () => {
  assert.deepEqual(
    normalizeAddonSelections([1, { id: 1, quantity: 2 }, { id: 2, qty: 1 }]),
    [{ id: 1, quantity: 3 }, { id: 2, quantity: 1 }]
  );
});

test('resolveSelectedAddons menolak opsi milik produk lain', () => {
  assert.throws(
    () => resolveSelectedAddons([{ id: 1, name: 'Bungkus Kado', price: 5000 }], [{ id: 2, quantity: 1 }], 'Boneka Beruang'),
    /tidak valid/
  );
});

test('resolveSelectedAddons menyimpan jumlah dan membatasi maksimal 99', () => {
  assert.deepEqual(
    resolveSelectedAddons([{ id: 1, name: 'Bungkus Kado', price: 5000 }], [{ id: 1, quantity: 2 }]),
    [{ id: 1, name: 'Bungkus Kado', price: 5000, quantity: 2 }]
  );
  assert.throws(
    () => resolveSelectedAddons([{ id: 1, name: 'Bungkus Kado', price: 5000 }], [{ id: 1, quantity: 100 }]),
    /1 sampai 99/
  );
});

test('buildAddonItemNotes menyimpan opsi retail dan catatan pelanggan', () => {
  const notes = buildAddonItemNotes(
    [{ id: 1, name: 'Bungkus Kado', quantity: 2 }, { id: 2, name: 'Kartu Ucapan', quantity: 1 }],
    'warna pita merah'
  );
  assert.equal(notes, 'Opsi: Bungkus Kado x2, Kartu Ucapan | warna pita merah');
});

test('harga produk dan jumlah opsi tambahan dihitung terpisah', () => {
  const pricing = calculateAddonAwareLinePricing(
    { effectivePrice: 8500, originalPrice: 8500 },
    [{ price: 1000, quantity: 10 }],
    10
  );
  assert.equal(pricing.lineTotal, 95000);
  assert.equal(pricing.price, 9500);
});
