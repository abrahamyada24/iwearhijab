const test = require('node:test');
const assert = require('node:assert/strict');

let fixture;
const db = new Proxy({}, { get: (_, key) => fixture[key] });
const prismaPath = require.resolve('../src/config/prisma');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: { prisma: db } };
const { getAllExpenses, createExpense } = require('../src/controllers/expenseController');
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } });

test('Filter kategori dan tanggal dipakai bersamaan; total mengikuti hasil kategori', async () => {
  let query;
  fixture = { expense: { findMany: async args => { query = args; return [{ category: 'Konveksi', amount: '125000.00' }, { category: 'Konveksi', amount: '75000.00' }]; } } };
  const res = response();
  await getAllExpenses({ query: { category: 'Konveksi', startDate: '2026-10-20', endDate: '2026-10-21' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(query.where.category, 'Konveksi');
  assert.ok(query.where.createdAt.gte instanceof Date);
  assert.ok(query.where.createdAt.lte > query.where.createdAt.gte);
  assert.equal(res.body.data.length, 2);
  assert.equal(res.body.total, 200000);
});

test('Semua kategori tetap memuat catatan historis tanpa menulis ulang kategori', async () => {
  fixture = { expense: { findMany: async ({ where }) => { assert.equal(where.category, undefined); return [{ category: 'Lainnya', amount: 2000 }, { category: 'Umum', amount: 3000 }]; } } };
  const res = response();
  await getAllExpenses({ query: {} }, res);
  assert.equal(res.body.total, 5000);
  assert.equal(res.body.data[0].category, 'Lainnya');
});

test('Kategori filter yang tidak tersedia ditolak sebelum query database', async () => {
  fixture = {};
  for (const category of ['Lainnya', 'Bahan Baku', 'Utilitas', 'Tidak Ada']) {
    const res = response();
    await getAllExpenses({ query: { category } }, res);
    assert.equal(res.statusCode, 400, category);
  }
});

test('Pengeluaran dapat disimpan pada empat kategori dan default Umum', async () => {
  for (const category of ['Umum', 'Operasional', 'Konveksi', 'Gaji', undefined]) {
    let saved;
    fixture = {
      storeSetting: { findFirst: async () => ({ enableShift: false }) },
      expense: { create: async ({ data }) => { saved = data; return { id: 1, ...data }; } },
    };
    const res = response();
    await createExpense({ body: { description: 'Biaya perusahaan', amount: '125000', category } }, res);
    assert.equal(res.statusCode, 201, category);
    assert.equal(saved.category, category || 'Umum');
    assert.equal(saved.amount, 125000);
    assert.equal(saved.type, 'EXPENSE');
  }
});

test('Kategori lama tidak dapat dipakai untuk catatan pengeluaran baru', async () => {
  fixture = {};
  for (const category of ['Lainnya', 'Bahan Baku', 'Utilitas']) {
    const res = response();
    await createExpense({ body: { description: 'Biaya', amount: 1000, category } }, res);
    assert.equal(res.statusCode, 400, category);
  }
});

test('Pembelian tetap ditolak dan tidak menulis catatan pengeluaran', async () => {
  fixture = {};
  const res = response();
  await createExpense({ body: { description: 'Pembelian', amount: 1000, category: 'Umum', type: 'PURCHASE' } }, res);
  assert.equal(res.statusCode, 400);
});
