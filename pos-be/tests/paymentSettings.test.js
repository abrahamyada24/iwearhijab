const test = require('node:test');
const assert = require('node:assert/strict');
let fixture;
const prismaPath = require.resolve('../src/config/prisma');
const db = new Proxy({}, { get: (_, key) => fixture[key] });
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: { prisma: db } };
const { getSettings, updateSettings } = require('../src/controllers/settingController');
const response = () => ({ statusCode: 200, set() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test('Cash tetap aktif pada respons meskipun konfigurasi lama menonaktifkannya', async () => {
  fixture = { storeSetting: { findFirst: async () => ({ id: 1, enableCash: false, enableQris: true, enableDebit: true }) } };
  const res = response();
  await getSettings({}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.enableCash, true);
  assert.equal(res.body.data.enableQris, false);
  assert.equal(res.body.data.enableDebit, false);
});
test('Simpan pengaturan mempertahankan Cash aktif ketika klien lama mengirim false', async () => {
  let saved;
  fixture = { storeSetting: { findFirst: async () => ({ id: 1 }), upsert: async ({ update }) => { saved = update; return { id: 1, ...update }; } } };
  const res = response();
  await updateSettings({ body: { enableCash: false, enableQris: true, enableDebit: true, storeName: 'Iwearing Hijab' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(saved.enableCash, true);
  assert.equal(saved.enableQris, false);
  assert.equal(saved.enableDebit, false);
  assert.equal(res.body.data.enableCash, true);
});
