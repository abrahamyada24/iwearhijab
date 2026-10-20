// Browser fixtures stay in memory; this script never contacts the database.
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const {
  calculateCheckoutTotals,
} = require("../pos-be/src/services/checkoutTotalsService");
const {
  calculateRewardRedemption,
} = require("../pos-be/src/services/rewardRedemptionService");
const base = process.env.IWEAR_QA_URL || "http://127.0.0.1:3210";
const output = "artifacts/revision-web";
fs.mkdirSync(output, { recursive: true });
const products = [
  {
    id: 1,
    name: "Pashmina",
    sku: "IWR-001",
    barcode: "89910001",
    variant: "Viscose",
    color: "Dusty Pink",
    categoryId: 1,
    category: { id: 1, name: "Hijab" },
    price: 50000,
    costPrice: 20000,
    stock: 20,
    isActive: true,
    unitLabel: "pcs",
    addons: [],
  },
  {
    id: 2,
    name: "Paris",
    sku: "IWR-002",
    barcode: "89910002",
    variant: "Paris Premium",
    color: "Cream",
    categoryId: 1,
    category: { id: 1, name: "Hijab" },
    price: 100000,
    costPrice: 30000,
    stock: 20,
    isActive: true,
    unitLabel: "pcs",
    addons: [],
  },
];
const config = {
  isActive: true,
  minRedemptionPoints: 10,
  pointMultiplier: 1,
  multiplierAmount: 10000,
  pointValue: 100,
};
const settings = {
  id: 1,
  storeName: "Iwearing Hijab",
  phone: "",
  address: "",
  logoUrl: "/branding/iwearing-hijab.png",
  taxRate: 0,
  enableShift: false,
  autoPrintReceipt: true,
  receiptFooter: "Terima kasih sudah berbelanja",
};
const dashboard = {
  summary: { todayRevenue: 150000, todayCount: 2, grossProfit: 100000 },
  todayPaymentBreakdown: {
    cash: 50000,
    qris: 100000,
    cashCount: 1,
    qrisCount: 1,
  },
  paymentBreakdown: { cash: 50000, qris: 100000 },
  chart: [],
  topProducts: [],
  categoryBreakdown: [],
};
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const errors = [];
  let checks = 0;
  try {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 900 },
    });
    const page = await context.newPage();
    let role = "ADMIN";
    let posted = [];
    let transaction;
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      window.__prints = 0;
      window.print = () => {
        window.__prints++;
      };
    });
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const p = url.pathname;
      let body = { success: true, data: [] };
      if (p === "/api/auth/me")
        body = {
          success: true,
          user: {
            id: 1,
            name: "Admin Iwear",
            role,
            mustChangePassword: false,
            activeStoreId: 1,
            stores: [{ id: 1, name: "Iwearing Hijab", role, type: "RETAIL" }],
          },
        };
      else if (p === "/api/license/status")
        body = { success: true, data: { isActive: true, plan: "PREMIUM" } };
      else if (p === "/api/settings") body = { success: true, data: settings };
      else if (p === "/api/settings/loyalty")
        body = { success: true, data: config };
      else if (p === "/api/products/categories")
        body = { success: true, data: [{ id: 1, name: "Hijab" }] };
      else if (p === "/api/products") body = { success: true, data: products };
      else if (p === "/api/customers")
        body = {
          success: true,
          data: [
            {
              id: 1,
              name: "Aisyah",
              phone: "081234567890",
              memberId: "MEM-001",
              points: 25,
            },
          ],
        };
      else if (p === "/api/reports/dashboard")
        body = { success: true, data: dashboard };
      else if (p === "/api/shifts/current")
        body = { success: true, data: null };
      else if (p === "/api/transactions" && request.method() === "POST") {
        const input = request.postDataJSON();
        posted.push({ input, key: request.headers()["idempotency-key"] });
        const lines = input.items.map((item) => ({
          ...item,
          price: products.find((p) => p.id === item.productId).price,
        }));
        const redemption = calculateRewardRedemption({
          lines,
          points: input.loyaltyPointsRedeemed,
          customer: input.customerId ? { points: 25 } : null,
          config,
        });
        const totals = calculateCheckoutTotals({
          subTotal: lines.reduce((s, l) => s + l.qty * l.price, 0),
          discountAmount: input.discountAmount,
          discountType: input.discountType,
          loyaltyDiscount: redemption.discount,
        });
        transaction = {
          id: posted.length,
          invoiceNumber: `INV/20261020/${posted.length}-QA`,
          createdAt: "2026-10-20T02:18:00Z",
          status: "PAID",
          customerId: input.customerId,
          customerName: input.customerName,
          user: { name: "Admin Iwear" },
          items: lines.map((line) => ({
            ...line,
            product: products.find((p) => p.id === line.productId),
          })),
          subTotal: lines.reduce((sum, line) => sum + line.qty * line.price, 0),
          discountAmount: totals.discount,
          grandTotal: totals.grandTotal,
          taxAmount: totals.taxAmount,
          cashAmount: input.payment.cashAmount,
          changeAmount:
            input.payment.type === "CASH"
              ? input.payment.cashAmount - totals.grandTotal
              : 0,
          pointsEarned: Math.floor(totals.grandTotal / 10000),
          pointsRedeemed: redemption.points,
          pointsBalanceAfter:
            25 - redemption.points + Math.floor(totals.grandTotal / 10000),
          payments: [
            { paymentType: input.payment.type, amount: totals.grandTotal },
          ],
        };
        body = { success: true, data: transaction };
      } else if (p === "/api/transactions")
        body = {
          success: true,
          data: [],
          meta: { page: 1, totalPages: 1, total: 0 },
        };
      else if (p === "/api/expenses")
        body = { success: true, data: [], total: 0 };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    await page.goto(base + "/pos");
    await page.getByText("Pashmina", { exact: true }).click();
    await page.getByText("Paris", { exact: true }).click();
    assert.equal(
      await page
        .getByRole("button", { name: "Pre Order", exact: true })
        .count(),
      0,
    );
    checks++;
    await page
      .getByRole("button", { name: "Pembayaran", exact: false })
      .click();
    assert.equal(
      await page.getByRole("button", { name: /Tukar Point/ }).count(),
      0,
    );
    assert.equal(
      await page.getByText("Transfer Bank", { exact: false }).count(),
      0,
    );
    checks++;
    await page
      .getByRole("button", { name: "Tutup pembayaran", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Pilih dari daftar member", exact: false })
      .click();
    await page.getByText("Aisyah", { exact: true }).click();
    await page
      .getByRole("button", { name: "Pembayaran", exact: false })
      .click();
    await page.getByRole("button", { name: /Tukar Point/ }).click();
    await page
      .getByRole("button", { name: "Tambah penukaran Paris", exact: true })
      .click();
    await page.screenshot({ path: output + "/reward-desktop.png" });
    await page
      .getByRole("button", { name: "Gunakan Poin", exact: true })
      .click();
    await page.getByRole("button", { name: /Tunai \(Cash\)/ }).click();
    await page.getByRole("textbox", { name: "Uang diterima" }).fill("60000");
    await page
      .getByRole("button", { name: "Bayar Sekarang", exact: false })
      .click();
    await page.getByRole("heading", { name: "Preview Struk 58 mm" }).waitFor();
    await page.waitForFunction(() => window.__prints === 1);
    assert.equal(posted.length, 1);
    assert.ok(posted[0].key);
    assert.equal(posted[0].input.loyaltyPointsRedeemed, 10);
    assert.equal(transaction.grandTotal, 50000);
    assert.equal(transaction.changeAmount, 10000);
    checks++;
    const receipt = page.locator("#pos-receipt-print");
    assert.match(await receipt.innerText(), /Pelanggan: Aisyah/);
    assert.doesNotMatch(await receipt.innerText(), /Jenis:/);
    assert.match(await receipt.innerText(), /Poin ditukar/);
    assert.match(
      await receipt.evaluate((node) => getComputedStyle(node).fontFamily),
      /Arial/,
    );
    checks++;
    await page.screenshot({ path: output + "/receipt-desktop.png" });
    await page.getByRole("button", { name: "Tutup preview struk" }).click();
    await page.getByRole("button", { name: "Cetak / Lihat Struk" }).click();
    await page.waitForTimeout(650);
    assert.equal(await page.evaluate(() => window.__prints), 1);
    checks++;
    await page.goto(base + "/products");
    await page.getByTitle("Label QR Produk").first().click();
    await page.locator("#product-qr-label img").waitFor();
    assert.match(
      await page.locator("#product-qr-label").innerText(),
      /Viscose/,
    );
    assert.match(
      await page.locator("#product-qr-label").innerText(),
      /Dusty Pink/,
    );
    await page.screenshot({ path: output + "/label-desktop.png" });
    checks++;
    await page.getByRole("button", { name: "Tutup label" }).click();
    await page.getByText("Pashmina", { exact: true }).first().click();
    await page.getByPlaceholder("Contoh: Pashmina").waitFor();
    checks++;
    await page.goto(base + "/reports");
    await page.getByRole("button", { name: "CSV", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Retur", exact: true }).count(), 0);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV", exact: true }).click();
    assert.match((await downloadPromise).suggestedFilename(), /\.csv$/);
    checks++;
    await page.goto(base + "/expenses");
    assert.equal(await page.getByRole("link", { name: "Pengeluaran", exact: true }).getAttribute("aria-current"), "page");
    assert.equal(await page.getByText("Pembelian", { exact: true }).count(), 0);
    await page.getByRole("button", { name: "Tambah", exact: true }).click();
    assert.equal(
      await page.locator("option").filter({ hasText: "Konveksi" }).count(),
      1,
    );
    assert.equal(
      await page.locator("option").filter({ hasText: "Utilitas" }).count(),
      0,
    );
    checks++;
    await page.goto(base + "/stock");
    await page.getByRole("heading", { name: "Riwayat Stok" }).waitFor();
    assert.equal(
      await page.getByRole("button", { name: "Stock Opname" }).count(),
      0,
    );
    checks++;
    role = "CASHIER";
    await page.goto(base + "/");
    await page.getByText("Total Penjualan Cash", { exact: true }).waitFor();
    assert.equal(
      await page.getByText("Gross Profit", { exact: true }).count(),
      0,
    );
    assert.equal(
      await page
        .getByRole("link", { name: "Pengeluaran", exact: true })
        .count(),
      0,
    );
    await page.locator("canvas").first().waitFor();
    await page.screenshot({ path: output + "/staff-dashboard.png" });
    checks++;
    await page.goto(base + "/expenses");
    await page.waitForURL(base + "/");
    checks++;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + "/pos");
    await page.getByText("Pashmina", { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.screenshot({ path: output + "/pos-mobile.png" });
    checks++;
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.addInitScript(() => {
      window.__serialWrites = [];
      const port = {
        open: async () => {},
        writable: {
          getWriter: () => ({
            write: async (bytes) =>
              window.__serialWrites.push(Array.from(bytes)),
            releaseLock: () => {},
          }),
        },
      };
      Object.defineProperty(navigator, "serial", {
        value: { getPorts: async () => [port] },
        configurable: true,
      });
      localStorage.setItem("iwear_serial_printer", "true");
    });
    const waitForRawPrint = () =>
      page.waitForFunction(() =>
        window.__serialWrites.some(
          (bytes) => bytes[0] === 27 && bytes[1] === 100,
        ),
      );
    const pulses = () =>
      page.evaluate(
        () =>
          window.__serialWrites.filter(
            (bytes) => bytes[0] === 27 && bytes[1] === 112,
          ).length,
      );
    // A barcode scanner sends the product code followed by Enter.
    await page.goto(base + "/pos");
    await page.getByPlaceholder("Cari produk...").fill("89910001");
    await page.getByPlaceholder("Cari produk...").press("Enter");
    await page
      .getByRole("button", { name: "Pembayaran", exact: false })
      .click();
    await page.getByRole("button", { name: /Tunai \(Cash\)/ }).click();
    await page.getByRole("textbox", { name: "Uang diterima" }).fill("60000");
    await page.getByRole("button", { name: "Bayar Sekarang" }).click();
    await waitForRawPrint();
    await page.waitForFunction(() =>
      window.__serialWrites.some(
        (bytes) => bytes[0] === 27 && bytes[1] === 112,
      ),
    );
    assert.equal(await pulses(), 1);
    assert.equal(await page.evaluate(() => window.__prints), 0);
    checks++;
    const guestReceipt = await page.locator("#pos-receipt-print").innerText();
    assert.doesNotMatch(guestReceipt, /Pelanggan:|Jenis:|Poin didapat/);
    checks++;
    await page
      .getByRole("button", { name: "Cetak Struk", exact: true })
      .click();
    await page.waitForTimeout(500);
    assert.equal(await pulses(), 1);
    checks++;
    // Exact cash and QRIS may print but must never open a drawer.
    for (const payment of ["CASH", "QRIS_MANUAL"]) {
      await page.goto(base + "/pos");
      await page.getByText("Pashmina", { exact: true }).click();
      await page
        .getByRole("button", { name: "Pembayaran", exact: false })
        .click();
      if (payment === "CASH") {
        await page.getByRole("button", { name: /Tunai \(Cash\)/ }).click();
        await page.getByRole("button", { name: "Uang Pas" }).click();
        await page.getByRole("button", { name: "Bayar Sekarang" }).click();
      } else {
        await page
          .getByRole("button", { name: /QRIS Kasir konfirmasi/ })
          .click();
        await page.getByRole("button", { name: "Sudah Diterima" }).click();
      }
      await waitForRawPrint();
      assert.equal(await pulses(), 0);
      checks++;
    }
    // Fully redeemed sale records POINT, with no cash/card payment and no drawer pulse.
    await page.goto(base + "/pos");
    await page.getByText("Pashmina", { exact: true }).click();
    await page
      .getByRole("button", { name: "Pilih dari daftar member", exact: false })
      .click();
    await page.getByText("Aisyah", { exact: true }).click();
    await page
      .getByRole("button", { name: "Pembayaran", exact: false })
      .click();
    await page.getByRole("button", { name: /Tukar Point/ }).click();
    await page
      .getByRole("button", { name: "Tambah penukaran Pashmina", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Gunakan Poin", exact: true })
      .click();
    await page.getByRole("button", { name: "Selesaikan Pembayaran" }).click();
    await waitForRawPrint();
    assert.equal(posted.at(-1).input.payment.type, "POINT");
    assert.equal(transaction.grandTotal, 0);
    assert.equal(await pulses(), 0);
    checks++;
    await page.goto(base + "/settings");
    await page.getByRole("button", { name: "Printer", exact: true }).click();
    await page.getByRole("button", { name: "Test Print", exact: true }).click();
    await waitForRawPrint();
    assert.equal(await pulses(), 0);
    checks++;
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        { checks, pageErrors: errors, screenshots: output },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
