import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { calculateCheckoutTotals } from '../src/utils/checkoutTotals.js';
import { validatePhoneInput, restrictPhoneInput } from '../src/utils/phone.js';
import { buildReportExport } from '../src/utils/reportExport.js';
import { normalizePathname, isRouteActive, canAccessPage } from '../src/utils/navigation.js';
const require = createRequire(import.meta.url);
const backend = require('../../pos-be/src/services/checkoutTotalsService');

test('menu aktif konsisten untuk trailing slash, query, submenu, dan navigasi langsung', () => {
  for (const path of ['/', '/products', '/categories', '/stock', '/transactions', '/reports', '/expenses', '/users', '/customers', '/settings', '/shifts']) {
    for (const suffix of ['', '/', '/?from=sidebar']) assert.equal(isRouteActive(path + suffix, path), true);
  }
  assert.equal(normalizePathname('/expenses///?from=sidebar'), '/expenses');
  assert.equal(isRouteActive('/products/12/', '/products'), true);
  assert.equal(isRouteActive('/products/', '/'), false);
  assert.equal(isRouteActive('/products-other/', '/products'), false);
});
test('Staff dapat membuka inventori dan member, tanpa laporan, pengeluaran, atau pengguna', () => {
  for (const path of ['/products/', '/categories/', '/stock/', '/customers/', '/settings/', '/license/']) assert.equal(canAccessPage('CASHIER', path), true);
  for (const path of ['/expenses/', '/reports/', '/reports/profit-loss/', '/users/']) assert.equal(canAccessPage('CASHIER', path), false);
  for (const role of ['ADMIN', 'OWNER']) for (const path of ['/products/', '/reports/', '/expenses/', '/users/']) assert.equal(canAccessPage(role, path), true);
  assert.equal(canAccessPage(undefined, '/products/'), false);
});

test('tagihan frontend dan server sama untuk diskon nominal/persen dan pajak', () => {
  for (const subTotal of [0, 325000, 99999]) for (const discountType of ['amount', 'percent']) for (const taxRate of [0, 0.11]) {
    const input = { subTotal, discountType, discountAmount: 10, taxRate };
    assert.deepEqual(calculateCheckoutTotals(input), backend.calculateCheckoutTotals(input));
  }
});
test('produk gratis dan diskon memakai perhitungan yang sama di web/server', () => {
  for (const loyaltyDiscount of [0,50000,200000]) for (const discountType of ['amount','percent']) {
    const input={subTotal:200000,taxRate:0.11,discountAmount:10,discountType,loyaltyDiscount};
    assert.deepEqual(calculateCheckoutTotals(input),backend.calculateCheckoutTotals(input));
  }
  assert.deepEqual(calculateCheckoutTotals({subTotal:200000,loyaltyDiscount:50000,discountType:'percent',discountAmount:10,taxRate:0.11}),{discount:65000,taxAmount:14850,grandTotal:149850});
});
test('input telepon menjaga nol awal, menolak huruf dan memvalidasi panjang', () => {
  assert.equal(restrictPhoneInput('0812abc3456789'), '08123456789');
  assert.equal(restrictPhoneInput('+62 (812) 345-6789'), '+628123456789');
  assert.equal(validatePhoneInput('08123456789'), '');
  assert.notEqual(validatePhoneInput('nama'), '');
});
test('ekspor laporan menampilkan nilai kategori pengeluaran dari respons API', () => {
  const report = buildReportExport('LABARUGI', { profitLossData: { grossRevenue: 500000, cogs: 130000, totalExpenses: 2500000, netProfit: -2130000, expenseBreakdown: [{ category: 'Gaji', amount: 2500000 }] } });
  const total = report.rows.find(row => row.component === 'Pengeluaran');
  const category = report.rows.find(row => row.component === 'Rincian pengeluaran: Gaji');
  assert.equal(category.amount, -2500000);
  assert.equal(category.amount, total.amount);
});
