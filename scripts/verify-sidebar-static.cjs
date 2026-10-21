// Serve the real Next.js static export, with API fixtures only in browser memory.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const exported = path.resolve(__dirname, '../pos-fe/out');
const output = path.resolve(__dirname, '../artifacts/sidebar-role');
const reportOutput = path.resolve(__dirname, '../artifacts/reports-expenses');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = path.resolve(exported, '.' + decodeURIComponent(url.pathname));
  if (file !== exported && !file.startsWith(exported + path.sep)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!url.pathname.endsWith('/')) { res.writeHead(308, { Location: url.pathname + '/' + url.search }).end(); return; }
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': (mime[path.extname(file)] || 'application/octet-stream') + (['.html','.js','.css','.txt'].includes(path.extname(file)) ? '; charset=utf-8' : '') });
  fs.createReadStream(file).pipe(res);
});

const product = { id: 1, name: 'Pashmina', sku: 'IWR-001', price: 50000, effectivePrice: 50000, stock: 20, isActive: true, categoryId: 1, category: { id: 1, name: 'Hijab' }, addons: [] };
const settings = { storeName: 'Iwearing Hijab', enableShift: false, taxRate: 0, autoPrintReceipt: true };
const member = { id: 1, name: 'Aisyah', memberId: 'MEM-001', points: 25, totalVisits: 1, totalSpent: 50000 };
const transaction = {
  id: 1, invoiceNumber: 'INV-20261021-001', createdAt: '2026-10-21T03:00:00Z', status: 'PAID',
  customerId: 1, customerName: member.name, customer: member, user: { name: 'Staff Iwear' },
  grandTotal: 50000, subTotal: 50000, taxAmount: 0, discountAmount: 0,
  payments: [{ paymentType: 'QRIS_MANUAL', amount: 50000 }],
  items: [{ productId: 1, product, qty: 1, price: 50000 }],
};
const menus = [
  ['/', 'Dashboard'], ['/products/', 'Daftar Produk'], ['/categories/', 'Kategori'], ['/stock/', 'Riwayat Stok'],
  ['/transactions/', 'Transaksi'], ['/reports/', 'Laporan'], ['/expenses/', 'Pengeluaran'], ['/users/', 'Pengguna'], ['/customers/', 'Member'], ['/settings/', 'Pengaturan'],
];

(async () => {
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(reportOutput, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  let checks = 0;
  const errors = [];
  try {
    for (const role of ['ADMIN', 'OWNER', 'CASHIER']) {
      const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(`${role}: ${error.message}`));
      const transactionQueries = [];
      let detailRequests = 0;
      const expenseRequests = [];
      let expenseRecords = [
        { id: 1, description: 'Gaji Oktober', category: 'Gaji', amount: 100000, createdAt: transaction.createdAt },
        { id: 2, description: 'Jahit hijab', category: 'Konveksi', amount: 50000, createdAt: transaction.createdAt },
        { id: 3, description: 'Catatan historis', category: 'Lainnya', amount: 2000, createdAt: transaction.createdAt },
      ];
      await context.route('**/api/**', async route => {
        const requestUrl = new URL(route.request().url());
        const p = requestUrl.pathname;
        let body = { success: true, data: [] };
        if (p === '/api/auth/me') body = { success: true, user: { id: 1, name: role === 'CASHIER' ? 'Staff Iwear' : 'Admin Iwear', role, mustChangePassword: false, activeStoreId: 1, stores: [{ id: 1, name: 'Iwearing Hijab', role, type: 'RETAIL' }] } };
        else if (p === '/api/license/status') body.data = { isActive: true, plan: 'PREMIUM' };
        else if (p === '/api/settings') body.data = settings;
        else if (p === '/api/settings/loyalty') body.data = { isActive: true, multiplierAmount: 10000, pointMultiplier: 1, minRedemptionPoints: 10, pointValue: 100 };
        else if (p === '/api/products') body.data = [product];
        else if (p === '/api/products/categories') body.data = [{ id: 1, name: 'Hijab', totalProducts: 1, totalStock: 20 }];
        else if (p === '/api/customers') body.data = [member];
        else if (p === '/api/shifts/current') body.data = null;
        else if (p === '/api/transactions') {
          transactionQueries.push(requestUrl.searchParams);
          const search = requestUrl.searchParams.get('search') || '';
          const { items, ...listTransaction } = transaction;
          body.data = [listTransaction].filter(row => [row.invoiceNumber, row.customer.name, row.customer.memberId].some(value => value.includes(search)));
          body.meta = { page: 1, totalPages: 1, total: body.data.length };
        }
        else if (p === '/api/transactions/1') { detailRequests++; body.data = transaction; }
        else if (p === '/api/expenses') {
          if (route.request().method() === 'POST') {
            const data = route.request().postDataJSON();
            expenseRequests.push(data);
            body.data = { ...data, id: expenseRecords.length + 1, amount: Number(data.amount), createdAt: transaction.createdAt };
            expenseRecords.push(body.data);
          } else {
            const category = requestUrl.searchParams.get('category');
            body.data = expenseRecords.filter(row => !category || row.category === category);
            body.total = body.data.reduce((sum, row) => sum + row.amount, 0);
          }
        }
        else if (p === '/api/reports/dashboard') body.data = { summary: { todayRevenue: 125000, todayCount: 3, grossProfit: 10000 }, todayPaymentBreakdown: { cash: 50000, qris: 75000, cashCount: 1, qrisCount: 2 }, chart: [], topProducts: [] };
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      });

      const allowed = menus.filter(([, label]) => role !== 'CASHIER' || !['Laporan','Pengeluaran','Pengguna'].includes(label));
      for (const [url, label] of allowed) {
        await page.goto(base + url);
        const nav = page.locator('aside');
        const active = nav.getByRole('link', { name: label, exact: true });
        await active.waitFor();
        await page.waitForFunction(() => document.querySelector('aside a[aria-current="page"]'));
        assert.equal(await active.getAttribute('aria-current'), 'page', `${role} ${url}`);
        assert.equal(await nav.locator('a[aria-current="page"]').count(), 1, `${role} has only one active page`);
        const colors = await active.evaluate(node => ({ bg: getComputedStyle(node).backgroundColor, color: getComputedStyle(node).color }));
        assert.notEqual(colors.bg, 'rgba(0, 0, 0, 0)', `${role} ${url} has visible highlight`);
        assert.ok((await active.getAttribute('class')).includes('bg-blue-50'));
        if (url !== '/') assert.ok(new URL(page.url()).pathname.endsWith('/'));
        if (['Daftar Produk','Kategori','Riwayat Stok'].includes(label)) {
          assert.equal(await nav.getByRole('button', { name: 'Produk & Stok' }).getAttribute('data-active'), 'true');
          assert.equal(await nav.getByRole('button', { name: 'Produk & Stok' }).getAttribute('aria-expanded'), 'true');
        } else assert.equal(await nav.getByRole('button', { name: 'Produk & Stok' }).getAttribute('data-active'), null);
        assert.equal(await nav.getByRole('link', { name: 'Lisensi Outlet', exact: true }).count(), 0);
        assert.equal(await nav.getByRole('link', { name: 'Pegawai', exact: true }).count(), 0);
        assert.equal(await nav.getByRole('link', { name: 'Pelanggan', exact: true }).count(), 0);
        await nav.getByRole('heading', { name: 'SISTEM KASIR', exact: true }).waitFor();
        if (url === '/settings/') {
          for (const hidden of ['Pembayaran', 'Tentang Aplikasi']) assert.equal(await page.getByRole('button', { name: hidden, exact: true }).count(), 0);
          await page.getByRole('button', { name: 'Printer', exact: true }).click();
          await page.getByRole('button', { name: 'Test Print', exact: true }).waitFor();
          checks++;
        }
        if (url === '/reports/') {
          const main = page.locator('main');
          await main.getByRole('button', { name: `Detail transaksi ${transaction.invoiceNumber}`, exact: true }).waitFor();
          assert.deepEqual(await main.getByRole('columnheader').allTextContents(), ['Invoice', 'Waktu', 'Kasir', 'Total', 'Status']);
          assert.equal(await main.getByRole('button', { name: 'Retur', exact: true }).count(), 0);
          assert.equal(await main.getByRole('button', { name: 'Pelanggan', exact: true }).count(), 0);
          await main.getByRole('button', { name: 'Member', exact: true }).click();
          await main.getByRole('columnheader', { name: 'Member', exact: true }).waitFor();
          await main.getByRole('button', { name: 'Transaksi', exact: true }).click();
          const open = main.getByRole('button', { name: `Detail transaksi ${transaction.invoiceNumber}`, exact: true });
          await open.waitFor();
          if (role === 'ADMIN') await page.screenshot({ path: path.join(reportOutput, 'admin-reports.png') });
          const previousRequests = detailRequests;
          await open.click();
          await page.getByRole('heading', { name: 'Detail Transaksi', exact: true }).waitFor();
          assert.equal(detailRequests, previousRequests + 1, 'reports fetch full items from detail endpoint');
          const modal = page.locator('div.fixed').filter({ has: page.getByRole('heading', { name: 'Detail Transaksi', exact: true }) });
          for (const label of ['Member', 'Aisyah', 'Pashmina', 'QRIS']) assert.equal(await modal.getByText(label, { exact: true }).count(), 1, label);
          for (const removed of ['Pelanggan', 'QRIS_MANUAL']) assert.equal(await modal.getByText(removed, { exact: true }).count(), 0);
          if (role === 'ADMIN') {
            await page.screenshot({ path: path.join(reportOutput, 'admin-report-detail.png') });
            await page.setViewportSize({ width: 390, height: 844 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.screenshot({ path: path.join(reportOutput, 'admin-report-detail-mobile.png') });
            await page.setViewportSize({ width: 1366, height: 900 });
          }
          await modal.getByRole('button', { name: 'Tutup', exact: true }).click();
          checks += 2;
        }
        if (url === '/expenses/') {
          const main = page.locator('main');
          await main.getByText('Gaji Oktober', { exact: true }).waitFor();
          await main.getByText('Pencatatan pengeluaran perusahaan', { exact: true }).waitFor();
          assert.deepEqual(await main.getByRole('columnheader').allTextContents(), ['Tanggal', 'Deskripsi', 'Kategori', 'Jumlah', '']);
          assert.equal(await main.getByText('Pengeluaran', { exact: true }).count(), 1, 'only heading, no expense summary card');
          assert.equal(await main.getByText(/Filtered:/).count(), 0);
          const filter = page.getByRole('combobox', { name: 'Filter kategori pengeluaran', exact: true });
          assert.deepEqual(await filter.locator('option').allTextContents(), ['Semua Kategori', 'Umum', 'Operasional', 'Konveksi', 'Gaji']);
          const total = page.getByRole('region', { name: 'Total pengeluaran', exact: true });
          assert.match(await total.innerText(), /152\.000/);
          await filter.selectOption('Konveksi');
          await main.getByText('Jahit hijab', { exact: true }).waitFor();
          await page.waitForFunction(() => document.querySelector('section[aria-label="Total pengeluaran"]').textContent.includes('50.000'));
          assert.equal(await main.getByText('Gaji Oktober', { exact: true }).count(), 0);
          await filter.selectOption('Operasional');
          await main.getByText('Belum ada pengeluaran', { exact: true }).waitFor();
          assert.match(await total.innerText(), /0 catatan/);
          await filter.selectOption('');
          await main.getByText('Catatan historis', { exact: true }).waitFor();
          const dated = page.waitForResponse(res => {
            const query = new URL(res.url());
            return query.pathname === '/api/expenses' && query.searchParams.get('startDate') === '2026-10-19';
          });
          await page.getByLabel('Tanggal awal pengeluaran').fill('2026-10-19'); await dated;
          if (role === 'ADMIN') await page.screenshot({ path: path.join(reportOutput, 'admin-expenses.png') });
          await main.getByRole('button', { name: 'Tambah', exact: true }).click();
          const form = page.locator('form');
          const category = form.getByRole('combobox', { name: 'Kategori pengeluaran', exact: true });
          assert.deepEqual(await category.locator('option').allTextContents(), ['Umum', 'Operasional', 'Konveksi', 'Gaji']);
          assert.equal(await form.getByRole('button', { name: 'Pembelian', exact: true }).count(), 0);
          await form.getByPlaceholder('Deskripsi', { exact: true }).fill('Jahit tambahan');
          await form.getByPlaceholder('Jumlah (Rp)', { exact: true }).fill('25000');
          await category.selectOption('Konveksi');
          if (role === 'ADMIN') await page.screenshot({ path: path.join(reportOutput, 'admin-expense-form.png') });
          await form.getByRole('button', { name: 'Simpan', exact: true }).click();
          await main.getByText('Jahit tambahan', { exact: true }).waitFor();
          assert.equal(expenseRequests.length, 1);
          assert.deepEqual(expenseRequests[0], { description: 'Jahit tambahan', amount: '25000', category: 'Konveksi', type: 'EXPENSE' });
          assert.match(await total.innerText(), /177\.000/);
          if (role === 'ADMIN') {
            await page.setViewportSize({ width: 390, height: 844 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.screenshot({ path: path.join(reportOutput, 'admin-expenses-mobile.png') });
            await main.getByRole('button', { name: 'Tambah', exact: true }).click();
            await category.waitFor();
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.screenshot({ path: path.join(reportOutput, 'admin-expense-form-mobile.png') });
            await form.getByRole('button', { name: 'Batal', exact: true }).click();
            await page.setViewportSize({ width: 1366, height: 900 });
          }
          checks += 3;
        }
        if (url === '/transactions/') {
          const table = page.locator('main table');
          await table.getByText(transaction.invoiceNumber, { exact: true }).waitFor();
          assert.deepEqual(await table.getByRole('columnheader').allTextContents(), ['No', 'Invoice', 'Waktu', 'Member', 'Total', 'Metode', 'Status', 'Aksi']);
          assert.equal(await page.locator('main').getByRole('combobox').count(), 0);
          assert.equal(await page.getByRole('button', { name: /Pre.?Order/i }).count(), 0);
          assert.equal(await table.getByText('QRIS', { exact: true }).count(), 1);
          assert.equal(await table.getByText('QRIS_MANUAL', { exact: true }).count(), 0);
          checks++;
          const search = page.getByRole('textbox', { name: 'Cari invoice atau member' });
          for (const term of ['Aisyah', 'MEM-001', transaction.invoiceNumber, 'TidakAdaMember']) {
            const response = page.waitForResponse(res => {
              const query = new URL(res.url());
              return query.pathname === '/api/transactions' && query.searchParams.get('search') === term;
            });
            await search.fill(term);
            await response;
            if (term === 'TidakAdaMember') {
              await table.getByText('Tidak ada transaksi ditemukan.', { exact: true }).waitFor();
              assert.equal(await table.locator('tbody td').getAttribute('colspan'), '8');
            } else await table.getByText(transaction.invoiceNumber, { exact: true }).waitFor();
          }
          const cleared = page.waitForResponse(res => new URL(res.url()).pathname === '/api/transactions' && !new URL(res.url()).searchParams.has('search'));
          await search.fill(''); await cleared;
          await table.getByText(transaction.invoiceNumber, { exact: true }).waitFor();
          const dated = page.waitForResponse(res => {
            const query = new URL(res.url());
            return query.pathname === '/api/transactions' && query.searchParams.get('startDate') === '2026-10-21' && query.searchParams.get('endDate') === '2026-10-21';
          });
          await page.getByLabel('Tanggal awal transaksi').fill('2026-10-21');
          await page.getByLabel('Tanggal akhir transaksi').fill('2026-10-21');
          await dated;
          assert.ok(transactionQueries.every(query => !query.has('status')));
          checks++;
          await table.getByText(transaction.invoiceNumber, { exact: true }).waitFor();
          if (role !== 'OWNER') await page.screenshot({ path: path.join(output, `${role.toLowerCase()}-transactions.png`) });
          await page.getByRole('button', { name: `Detail transaksi ${transaction.invoiceNumber}`, exact: true }).click();
          await page.getByRole('heading', { name: 'Detail Transaksi', exact: true }).waitFor();
          const detail = page.locator('.no-print').filter({ has: page.getByText('Metode pembayaran', { exact: true }) });
          assert.equal(await detail.getByText('Member', { exact: true }).count(), 1);
          assert.equal(await detail.getByText('Aisyah', { exact: true }).count(), 1);
          assert.equal(await detail.getByText('QRIS', { exact: true }).count(), 1);
          for (const removed of ['Pelanggan', 'Jenis Transaksi', 'QRIS_MANUAL']) assert.equal(await detail.getByText(removed, { exact: true }).count(), 0);
          if (role !== 'OWNER') await page.screenshot({ path: path.join(output, `${role.toLowerCase()}-transaction-detail.png`) });
          if (role === 'CASHIER') {
            await page.setViewportSize({ width: 390, height: 844 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.screenshot({ path: path.join(output, 'staff-transaction-detail-mobile.png') });
            await page.getByRole('button', { name: 'Tutup detail transaksi', exact: true }).click();
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await page.screenshot({ path: path.join(output, 'staff-transactions-mobile.png') });
            await page.setViewportSize({ width: 1366, height: 900 });
          } else await page.getByRole('button', { name: 'Tutup detail transaksi', exact: true }).click();
          checks++;
        }
        if (url === '/') {
          if (role === 'CASHIER') {
            const sales = page.getByRole('region', { name: 'Total Penjualan', exact: true });
            const count = page.getByRole('region', { name: 'Transaksi Selesai', exact: true });
            await sales.waitFor(); await count.waitFor();
            assert.equal(await page.locator('[data-payment-summary]').count(), 2);
            assert.match(await sales.innerText(), /Rp 50\.000/);
            assert.match(await sales.innerText(), /Rp 75\.000/);
            assert.equal(await count.locator('[data-payment-method="CASH"]').getByText('1', { exact: true }).count(), 1);
            assert.equal(await count.locator('[data-payment-method="QRIS"]').getByText('2', { exact: true }).count(), 1);
            for (const card of [sales, count]) {
              const cash = card.locator('[data-payment-method="CASH"]'); const qris = card.locator('[data-payment-method="QRIS"]');
              assert.ok((await cash.boundingBox()).x < (await qris.boundingBox()).x);
              assert.ok((await cash.getByText('CASH', { exact: true }).getAttribute('class')).includes('text-green-600'));
              assert.ok((await qris.getByText('QRIS', { exact: true }).getAttribute('class')).includes('text-blue-600'));
            }
            assert.equal(await page.getByText('Gross Profit', { exact: true }).count(), 0);
          } else {
            await page.locator('main').getByRole('link', { name: 'Kelola Produk', exact: true }).waitFor();
            assert.equal(await page.locator('main').getByRole('link', { name: 'Member', exact: true }).count(), 1);
            assert.equal(await page.locator('main').getByText('Kelola Data', { exact: true }).count(), 0);
            assert.equal(await page.locator('main').getByText('Rp', { exact: true }).count(), 1);
          }
          for (const removed of ['Stok Menipis','Stok Kritis']) assert.equal(await page.getByText(removed, { exact: true }).count(), 0);
          await page.locator('canvas').first().waitFor();
          if (role !== 'OWNER') await page.screenshot({ path: path.join(output, `${role.toLowerCase()}-dashboard.png`) });
          checks++;
        }
        if (role === 'CASHIER') {
          for (const hidden of ['Laporan','Pengeluaran','Pengguna']) assert.equal(await nav.getByRole('link', { name: hidden, exact: true }).count(), 0);
          if (url === '/products/') {
            assert.equal(await page.getByRole('button', { name: /Tambah Produk|Edit produk|Hapus produk/ }).count(), 0);
            await page.getByText('Pashmina', { exact: true }).click();
            assert.equal(await page.getByPlaceholder('AUTO_GENERATE').count(), 0);
          }
          if (url === '/categories/') assert.equal(await page.getByRole('button', { name: /Tambah|Edit kategori|Hapus kategori/ }).count(), 0);
        }
        checks++;
      }
      if (role === 'CASHIER') {
        for (const blocked of ['/expenses/', '/reports/', '/users/']) {
          await page.goto(base + blocked);
          await page.waitForURL(base + '/');
          checks++;
        }
      }
      // Cloudflare-style redirects, reload, client navigation, back, and forward.
      await page.goto(base + (role === 'CASHIER' ? '/stock' : '/expenses'));
      await page.locator('aside a[aria-current="page"]').waitFor();
      await page.reload();
      const initial = role === 'CASHIER' ? 'Riwayat Stok' : 'Pengeluaran';
      await page.locator('aside').getByRole('link', { name: initial, exact: true }).waitFor();
      await page.locator('aside').getByRole('link', { name: 'Member', exact: true }).click();
      await page.waitForURL(base + '/customers/');
      await page.waitForFunction(() => document.querySelector('aside a[href="/customers/"][aria-current="page"]'));
      await page.goBack();
      await page.waitForFunction(() => !location.pathname.startsWith('/customers'));
      await page.goForward();
      await page.waitForFunction(() => location.pathname.startsWith('/customers') && document.querySelector('aside a[aria-current="page"]')?.textContent.trim() === 'Member');
      checks++;
      await page.goto(base + (role === 'CASHIER' ? '/stock/' : '/expenses/'));
      await page.locator('aside a[aria-current="page"]').waitFor();
      if (role !== 'OWNER') await page.screenshot({ path: path.join(output, `${role.toLowerCase()}-desktop.png`) });
      if (role === 'CASHIER') {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(base + '/');
        await page.getByRole('region', { name: 'Total Penjualan', exact: true }).waitFor();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: path.join(output, 'staff-dashboard-mobile.png') });
        await page.goto(base + '/stock/');
        await page.reload();
        await page.locator('header').count();
        await page.locator('main').waitFor();
        await page.getByRole('button').filter({ has: page.locator('svg line[x1="3"][y1="12"]') }).click();
        await page.locator('aside').getByRole('link', { name: 'Member', exact: true }).click();
        await page.waitForURL(base + '/customers/');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: path.join(output, 'staff-mobile.png') });
        checks++;
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ checks, pageErrors: errors, staticExport: exported, screenshots: output }, null, 2));
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
