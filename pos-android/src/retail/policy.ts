export const isManager = (user: any) =>
  ['ADMIN', 'OWNER'].includes(String(user?.role || '').toUpperCase());
export const isOwner = (user: any) =>
  String(user?.role || '').toUpperCase() === 'OWNER';
export const canOpen = (user: any, route: string) =>
  ['OWNER', 'ADMIN', 'CASHIER', 'STAFF'].includes(
    String(user?.role || '').toUpperCase(),
  ) &&
  ([
    'Main',
    'POS',
    'Checkout',
    'ReceiptPreview',
    'ProductList',
    'CategoryList',
    'StockHistory',
    'Transaksi',
    'Member',
  ].includes(route) ||
    (['Laporan', 'Pengeluaran', 'UserManagement'].includes(route) &&
      isManager(user)));
export const expenseCategories = ['Umum', 'Operasional', 'Konveksi', 'Gaji'];
export const rupiah = (value: unknown) =>
  `Rp ${Math.round(Number(value) || 0).toLocaleString('id-ID')}`;
export const jakartaDate = (value: string | number | Date = Date.now()) => {
  const date = new Date(value);
  return new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);
};
export const dateTime = (value: string) =>
  new Date(value).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
export const paymentLabel = (value: string) =>
  value === 'QRIS_MANUAL' ? 'QRIS' : value || '-';
export const productLabel = (item: any) =>
  [item.name, item.variant, item.color].filter(Boolean).join(' / ');
export const matchesProduct = (item: any, text: string) =>
  [item.name, item.variant, item.color, item.sku, item.barcode]
    .join(' ')
    .toLowerCase()
    .includes(text.trim().toLowerCase());

export function checkoutTotals(
  lines: any[],
  rewards: Record<string, number>,
  discount: number,
  discountType: string,
  taxRate: number,
) {
  const subtotal = lines.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );
  const rewardDiscount = lines.reduce(
    (sum, item) =>
      sum +
      Number(item.price) *
        Math.min(item.quantity, Math.max(0, rewards[item.cartItemId] || 0)),
    0,
  );
  const remaining = Math.max(0, subtotal - rewardDiscount);
  const manualDiscount = Math.min(
    remaining,
    Math.round(
      discountType === 'percent' ? (remaining * discount) / 100 : discount,
    ),
  );
  const tax = Math.round(
    (Math.max(0, remaining - manualDiscount) * (Number(taxRate) || 0)) / 100,
  );
  return {
    subtotal,
    rewardDiscount,
    discount: rewardDiscount + manualDiscount,
    tax,
    total: remaining - manualDiscount + tax,
  };
}

export function receiptFromTransaction(transaction: any, fallback: any = {}) {
  const payment = transaction.payments?.[0] || {};
  const total = Number(transaction.grandTotal ?? 0);
  return {
    ...transaction,
    invoiceNumber: transaction.invoiceNumber,
    customerId: transaction.customerId,
    customerName:
      transaction.customer?.name ||
      transaction.customerName ||
      fallback.customerName ||
      'Umum',
    customerPhone:
      transaction.customer?.phone || fallback.customerPhone || null,
    subtotal: Number(transaction.subTotal ?? 0),
    total,
    discountAmount: Number(transaction.discountAmount || 0),
    taxAmount: Number(transaction.taxAmount || 0),
    paymentMethod: paymentLabel(
      payment.paymentType || transaction.paymentMethod,
    ),
    cashAmount: Number(transaction.cashAmount ?? payment.amount ?? total),
    changeAmount: Number(transaction.changeAmount || 0),
    paymentStatus: ['PAID', 'COMPLETED'].includes(transaction.status)
      ? 'PAID'
      : transaction.status,
    paidAmount: ['PAID', 'COMPLETED'].includes(transaction.status) ? total : 0,
    remainingAmount: 0,
    customerPoints: transaction.pointsBalanceAfter,
    items: (transaction.items || []).map((item: any) => ({
      ...item,
      name:
        item.product?.name ||
        item.name ||
        fallback.items?.find((line: any) => Number(line.id) === item.productId)
          ?.name ||
        'Produk',
      quantity: item.qty,
      price: Number(item.price),
      originalPrice: Number(item.originalPrice ?? item.price),
    })),
  };
}
