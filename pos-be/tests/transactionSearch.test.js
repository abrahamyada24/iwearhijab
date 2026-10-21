const test = require('node:test');
const assert = require('node:assert/strict');

let database;
const prismaPath = require.resolve('../src/config/prisma');
const db = new Proxy({}, { get: (_, key) => database[key] });
require.cache[prismaPath] = {
  id: prismaPath, filename: prismaPath, loaded: true,
  exports: { prisma: db, basePrisma: db, runWithStore: (_, fn) => fn() },
};
const { getAllTransactions } = require('../src/controllers/transactionController');

const transactions = [
  { id: 1, invoiceNumber: 'INV-001', customerId: 10, customerName: 'Aisyah Lama', customer: { name: 'Aisyah Baru', memberId: 'MEM-010' }, status: 'PAID', createdAt: new Date('2026-10-20T12:00:00') },
  { id: 2, invoiceNumber: 'INV-002', customerId: null, customerName: 'Tamu', customer: null, status: 'PAID', createdAt: new Date('2026-10-20T14:00:00') },
  { id: 3, invoiceNumber: 'INV-003', customerId: 11, customerName: 'Fatimah', customer: { name: 'Fatimah', memberId: 'MEM-011' }, status: 'PENDING', createdAt: new Date('2026-10-19T12:00:00') },
];

// Evaluate the Prisma filter against fixture records without connecting to a database.
function matches(record, where) {
  return Object.entries(where).every(([key, rule]) => {
    if (key === 'OR') return rule.some(branch => matches(record, branch));
    const value = record?.[key];
    if (rule && typeof rule === 'object') {
      if ('is' in rule) return value != null && matches(value, rule.is);
      if ('contains' in rule) return String(value ?? '').includes(rule.contains);
      if ('not' in rule) return value !== rule.not;
      return (!rule.gte || value >= rule.gte) && (!rule.lte || value <= rule.lte);
    }
    return value === rule;
  });
}

async function queryTransactions(query) {
  let listWhere;
  let countWhere;
  database = {
    transaction: {
      findMany: async ({ where, skip, take }) => {
        listWhere = where;
        return transactions.filter(row => matches(row, where)).slice(skip, skip + take);
      },
      count: async ({ where }) => { countWhere = where; return transactions.filter(row => matches(row, where)).length; },
    },
    $transaction: promises => Promise.all(promises),
  };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
  await getAllTransactions({ query }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(listWhere, countWhere, 'list and pagination count must use the same filter');
  return res.body;
}

test('Pencarian invoice tetap berjalan dalam kolom gabungan', async () => {
  const result = await queryTransactions({ search: 'INV-002' });
  assert.deepEqual(result.data.map(row => row.id), [2]);
});

test('Pencarian menemukan nama, ID member, dan nama member saat transaksi', async () => {
  for (const search of ['Aisyah Baru', 'MEM-010', 'Aisyah Lama', '  MEM-010  ']) {
    const result = await queryTransactions({ search });
    assert.deepEqual(result.data.map(row => row.id), [1], search);
    assert.equal(result.meta.total, 1);
  }
});

test('Pencarian member tidak mencocokkan nama tamu tanpa keanggotaan', async () => {
  const result = await queryTransactions({ search: 'Tamu' });
  assert.deepEqual(result.data, []);
  assert.equal(result.meta.total, 0);
});

test('Pencarian tetap digabung dengan tanggal dan status API', async () => {
  const result = await queryTransactions({ search: 'MEM-', startDate: '2026-10-20', endDate: '2026-10-20', status: 'PAID' });
  assert.deepEqual(result.data.map(row => row.id), [1]);
  const empty = await queryTransactions({ search: 'MEM-', startDate: '2026-10-20', endDate: '2026-10-20', status: 'PENDING' });
  assert.deepEqual(empty.data, []);
});

test('Pencarian kosong memuat semua transaksi dan pagination tetap sesuai hasil member', async () => {
  const all = await queryTransactions({ search: '   ' });
  assert.equal(all.meta.total, 3);
  const result = await queryTransactions({ search: 'MEM-', page: '2', limit: '1' });
  assert.deepEqual(result.data.map(row => row.id), [3]);
  assert.deepEqual(result.meta, { total: 2, page: 2, limit: 1, totalPages: 2 });
});
