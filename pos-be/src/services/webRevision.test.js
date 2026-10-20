const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateRewardRedemption } = require("./rewardRedemptionService");
const { paymentBreakdownFor } = require("./dashboardPaymentService");
const {
  sanitizeStaffData,
  restrictStaffResponse,
} = require("../middlewares/staffResponseMiddleware");
const config = { isActive: true, minRedemptionPoints: 10 };
const customer = { points: 25 };
const lines = [
  { qty: 2, price: 50000, loyaltyRewardQty: 1 },
  { qty: 1, price: 100000, loyaltyRewardQty: 1 },
];
test("poin ditukar sebagian untuk produk yang dipilih dengan harga server", () => {
  assert.deepEqual(
    calculateRewardRedemption({ lines, points: 20, customer, config }),
    { points: 20, discount: 150000, count: 2 },
  );
});
test("penukaran tanpa member, poin kurang, jumlah berlebih, dan manipulasi poin ditolak", () => {
  for (const input of [
    { customer: null },
    { customer: { points: 19 } },
    { points: 10 },
    { points: 21 },
    { config: { ...config, isActive: false } },
    { lines: [{ qty: 1, price: 100, loyaltyRewardQty: 2 }] },
    { lines: [{ qty: 1, price: 100, loyaltyRewardQty: -1 }] },
    { lines: [{ qty: 1, price: 100, loyaltyRewardQty: NaN }] },
  ])
    assert.throws(() =>
      calculateRewardRedemption({
        lines,
        points: 20,
        customer,
        config,
        ...input,
      }),
    );
});
test("pelanggan umum tanpa penukaran tetap bisa checkout", () => {
  assert.deepEqual(
    calculateRewardRedemption({
      lines: [{ qty: 1, price: 100 }],
      customer: null,
      config: null,
    }),
    { points: 0, discount: 0, count: 0 },
  );
});
test("QRIS manual dan lama digabung; nominal dan jumlah Cash/QRIS terpisah", () => {
  const trx = (payments) => ({ payments });
  assert.deepEqual(
    paymentBreakdownFor([
      trx([{ paymentType: "CASH", amount: 50000 }]),
      trx([{ paymentType: "QRIS_MANUAL", amount: 25000 }]),
      trx([{ paymentType: "QRIS", amount: 10000 }]),
      trx([{ paymentType: "POINT", amount: 0 }]),
    ]),
    {
      cash: 50000,
      qris: 35000,
      point: 0,
      cashCount: 1,
      qrisCount: 2,
      pointCount: 1,
    },
  );
});
test("respons Staff membuang laba, HPP dan pengeluaran hingga objek bersarang", () => {
  assert.deepEqual(
    sanitizeStaffData({
      summary: {
        todayRevenue: 100,
        grossProfit: 30,
        netProfit: 20,
        totalExpenses: 10,
      },
      expenses: { items: [{ amount: 10 }] },
      items: [{ price: 100, costPrice: 70 }],
      createdAt: new Date("2026-10-20T00:00:00Z"),
    }),
    {
      summary: { todayRevenue: 100 },
      items: [{ price: 100 }],
      createdAt: new Date("2026-10-20T00:00:00Z"),
    },
  );
});
test("middleware tidak menyunting respons Admin dan Owner", () => {
  for (const role of ["OWNER", "ADMIN", "CASHIER"]) {
    let received;
    const res = {
      json: (body) => {
        received = body;
      },
    };
    let next = false;
    restrictStaffResponse({ user: { role } }, res, () => {
      next = true;
    });
    res.json({ grossProfit: 100, todayRevenue: 200 });
    assert.equal(next, true);
    assert.deepEqual(
      received,
      role === "CASHIER"
        ? { todayRevenue: 200 }
        : { grossProfit: 100, todayRevenue: 200 },
    );
  }
});
