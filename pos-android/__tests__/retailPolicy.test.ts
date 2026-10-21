import {
  canOpen,
  checkoutTotals,
  expenseCategories,
  jakartaDate,
  matchesProduct,
  receiptFromTransaction,
} from '../src/retail/policy';
const {
  calculateCheckoutTotals,
} = require('../../pos-be/src/services/checkoutTotalsService');
const {
  calculateRewardRedemption,
} = require('../../pos-be/src/services/rewardRedemptionService');

describe('kontrak retail Android dengan web/backend', () => {
  test.each(['CASHIER', 'STAFF'])(
    '%s hanya mendapat akses operasional',
    role => {
      const user = { role };
      for (const route of [
        'Main',
        'ProductList',
        'CategoryList',
        'StockHistory',
        'Transaksi',
        'Member',
        'POS',
        'Checkout',
      ])
        expect(canOpen(user, route)).toBe(true);
      for (const route of [
        'Laporan',
        'Pengeluaran',
        'UserManagement',
        'PackageList',
        'StockOpname',
        'StockReceiving',
        'KitchenQueue',
      ])
        expect(canOpen(user, route)).toBe(false);
      expect(canOpen(null, 'POS')).toBe(false);
    },
  );
  test.each(['ADMIN', 'OWNER'])(
    '%s mendapat laporan tanpa menu yang dihapus',
    role => {
      expect(canOpen({ role }, 'Laporan')).toBe(true);
      expect(canOpen({ role }, 'Pengeluaran')).toBe(true);
      expect(canOpen({ role }, 'PackageList')).toBe(false);
    },
  );
  test('produk gratis, sisa poin, diskon, dan pajak sama dengan perhitungan server', () => {
    const lines = [
      { cartItemId: 'a', price: 45000, quantity: 3 },
      { cartItemId: 'b', price: 20000, quantity: 2 },
    ];
    const rewards = { a: 1, b: 1 };
    const redemption = calculateRewardRedemption({
      lines: lines.map(line => ({
        ...line,
        qty: line.quantity,
        loyaltyRewardQty: rewards[line.cartItemId as 'a' | 'b'],
      })),
      points: 20,
      customer: { points: 37 },
      config: { isActive: true, minRedemptionPoints: 10 },
    });
    for (const discountType of ['amount', 'percent']) {
      const local = checkoutTotals(lines, rewards, 10, discountType, 11);
      const server = calculateCheckoutTotals({
        subTotal: local.subtotal,
        taxRate: 0.11,
        discountAmount: 10,
        discountType,
        loyaltyDiscount: redemption.discount,
      });
      expect(local.total).toBe(server.grandTotal);
      expect(local.discount).toBe(server.discount);
      expect(local.tax).toBe(server.taxAmount);
    }
    expect(redemption.points).toBe(20);
    expect(37 - redemption.points).toBe(17);
    expect(checkoutTotals(lines, { a: 3, b: 2 }, 0, 'amount', 11).total).toBe(
      0,
    );
  });
  test('struk memakai total dan snapshot poin dari server, termasuk total nol', () => {
    const receipt = receiptFromTransaction(
      {
        id: 1,
        invoiceNumber: 'INV/1',
        customerId: 9,
        customerName: 'Member',
        subTotal: 45000,
        grandTotal: 0,
        discountAmount: 45000,
        status: 'PAID',
        payments: [{ paymentType: 'POINT', amount: 0 }],
        pointsEarned: 0,
        pointsRedeemed: 10,
        pointsBalanceAfter: 27,
        items: [{ productId: 2, qty: 1, price: 45000, loyaltyRewardQty: 1 }],
      },
      { items: [{ id: 2, name: 'Hijab / Rose' }] },
    );
    expect(receipt.total).toBe(0);
    expect(receipt.paymentMethod).toBe('POINT');
    expect(receipt.pointsBalanceAfter).toBe(27);
    expect(receipt.items[0].name).toBe('Hijab / Rose');
    expect(
      receiptFromTransaction({ payments: [{ paymentType: 'QRIS_MANUAL' }] })
        .paymentMethod,
    ).toBe('QRIS');
  });
  test('pencarian varian/warna/SKU dan tanggal Jakarta', () => {
    const product = {
      name: 'Hijab',
      variant: 'Pashmina',
      color: 'Dusty Rose',
      sku: 'SKU-1',
      barcode: '89901',
    };
    for (const search of ['pashmina', 'ROSE', 'SKU-1', '89901'])
      expect(matchesProduct(product, search)).toBe(true);
    expect(jakartaDate('2026-10-21T18:00:00Z')).toBe('2026-10-22');
    expect(expenseCategories).toEqual([
      'Umum',
      'Operasional',
      'Konveksi',
      'Gaji',
    ]);
  });
});
