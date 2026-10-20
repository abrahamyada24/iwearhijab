const test = require("node:test");
const assert = require("node:assert/strict");
let scenario;
const db = new Proxy({}, { get: (_, key) => scenario[key] });
const prismaPath = require.resolve("../src/config/prisma");
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: { basePrisma: db, prisma: db, runWithStore: (_id, fn) => fn() },
};
const {
  createTransaction,
} = require("../src/controllers/transactionController");
const fixture = () => {
  const state = {
    customer: { id: 1, points: 25 },
    products: [
      {
        id: 1,
        name: "Pashmina",
        sku: "P-1",
        price: 50000,
        costPrice: 20000,
        stock: 20,
        isActive: true,
        addons: [],
      },
      {
        id: 2,
        name: "Paris",
        sku: "P-2",
        price: 100000,
        costPrice: 30000,
        stock: 20,
        isActive: true,
        addons: [],
      },
    ],
    transactions: [],
    movements: [],
  };
  const config = {
    isActive: true,
    minRedemptionPoints: 10,
    multiplierAmount: 10000,
    pointMultiplier: 1,
  };
  const tx = {
    storeSetting: {
      findFirst: async () => ({ enableShift: false, taxRate: 0 }),
    },
    loyaltyConfig: { findFirst: async () => config },
    customer: {
      findUnique: async () => ({ ...state.customer }),
      updateMany: async ({ where, data }) => {
        if (state.customer.points < where.points.gte) return { count: 0 };
        state.customer.points += data.points.increment;
        return { count: 1 };
      },
    },
    product: {
      findUnique: async ({ where }) =>
        state.products.find((p) => p.id === where.id),
      updateMany: async ({ where, data }) => {
        const product = state.products.find((p) => p.id === where.id);
        if (product.stock < where.stock.gte) return { count: 0 };
        product.stock -= data.stock.decrement;
        return { count: 1 };
      },
    },
    stockMovement: { create: async ({ data }) => state.movements.push(data) },
    transaction: {
      findFirst: async ({ where }) =>
        where.androidId
          ? state.transactions.find((t) => t.androidId === where.androidId) ||
            null
          : state.transactions.at(-1) || null,
      create: async ({ data }) => {
        const transaction = {
          ...data,
          id: state.transactions.length + 1,
          createdAt: new Date(),
          pointsEarned: null,
          items: data.items.create,
          payments: [data.payments.create],
        };
        state.transactions.push(transaction);
        return transaction;
      },
      updateMany: async ({ where, data }) => {
        const transaction = state.transactions.find((t) => t.id === where.id);
        if (transaction.pointsEarned !== where.pointsEarned)
          return { count: 0 };
        Object.assign(transaction, data);
        return { count: 1 };
      },
      update: async ({ where, data }) =>
        Object.assign(
          state.transactions.find((t) => t.id === where.id),
          data,
        ),
    },
  };
  scenario = {
    ...tx,
    $transaction: async (work) => {
      const before = structuredClone(state);
      try {
        return await work(tx);
      } catch (error) {
        Object.assign(state, before);
        throw error;
      }
    },
  };
  return state;
};
const request = (overrides = {}) => ({
  storeId: 1,
  user: { id: 1, role: "ADMIN" },
  store: { type: "RETAIL" },
  get: () => "web-checkout-test-001",
  body: {
    customerId: 1,
    customerName: "Aisyah",
    items: [
      { productId: 1, qty: 1 },
      { productId: 2, qty: 1, loyaltyRewardQty: 1 },
    ],
    loyaltyPointsRedeemed: 10,
    discountAmount: 0,
    discountType: "amount",
    payment: { type: "CASH", cashAmount: 60000, changeAmount: 999999 },
    ...overrides,
  },
});
const response = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  set() {
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});
test("checkout menyimpan produk gratis, kembalian server, stok, dan saldo poin secara atomik", async () => {
  const state = fixture();
  const res = response();
  await createTransaction(request(), res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.grandTotal, 50000);
  assert.equal(res.body.data.changeAmount, 10000);
  assert.equal(res.body.data.items[1].loyaltyRewardQty, 1);
  assert.equal(res.body.data.items[1].loyaltyRewardDiscount, 100000);
  assert.equal(state.customer.points, 20);
  assert.deepEqual(
    state.products.map((p) => p.stock),
    [19, 19],
  );
  assert.equal(state.movements.length, 2);
  const replay = response();
  await createTransaction(request(), replay);
  assert.equal(replay.statusCode, 200);
  assert.equal(replay.body.idempotentReplay, true);
  assert.equal(state.transactions.length, 1);
  assert.equal(state.customer.points, 20);
  assert.deepEqual(
    state.products.map((p) => p.stock),
    [19, 19],
  );
});
test("Point bisa melunasi seluruh produk tanpa uang tunai", async () => {
  const state = fixture();
  const res = response();
  await createTransaction(
    request({
      items: [{ productId: 1, qty: 1, loyaltyRewardQty: 1 }],
      payment: { type: "POINT" },
    }),
    res,
  );
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.grandTotal, 0);
  assert.equal(res.body.data.payments[0].paymentType, "POINT");
  assert.equal(state.customer.points, 15);
});
test("QRIS manual tetap lunas dan tidak menerima nilai kembalian dari klien", async () => {
  fixture();
  const res = response();
  await createTransaction(
    request({ payment: { type: "QRIS_MANUAL", changeAmount: 100000 } }),
    res,
  );
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.changeAmount, 0);
  assert.equal(res.body.data.status, "PAID");
});
test("input pembayaran dan reward tidak valid tidak mengubah stok maupun poin", async () => {
  for (const input of [
    { payment: { type: "CASH", cashAmount: 49999 } },
    { payment: { type: "POINT" } },
    { payment: { type: "TRANSFER" } },
    { payment: { type: "QRIS" } },
    { loyaltyPointsRedeemed: 1 },
    { customerId: null },
    { items: [{ productId: 1, qty: 1, loyaltyRewardQty: 2 }] },
    { orderType: "PRE_ORDER" },
    { items: [{ productId: "pkg-1", qty: 1 }] },
  ]) {
    const state = fixture();
    const res = response();
    await createTransaction(request(input), res);
    assert.equal(res.statusCode, 400, JSON.stringify(input));
    assert.equal(state.customer.points, 25);
    assert.deepEqual(
      state.products.map((p) => p.stock),
      [20, 20],
    );
    assert.equal(state.transactions.length, 0);
  }
});
