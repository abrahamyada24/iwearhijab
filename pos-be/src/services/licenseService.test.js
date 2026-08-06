const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeActivationCode,
  serializeLicense,
} = require('./licenseService');

const baseLicense = (overrides = {}) => ({
  licenseNumber: 'LP-WARNAWARNI',
  plan: 'TRIAL',
  state: 'ACTIVE',
  startsAt: new Date('2026-08-01T00:00:00.000Z'),
  expiresAt: new Date('2026-08-15T00:00:00.000Z'),
  activatedAt: null,
  activationSource: 'AUTO_TRIAL',
  offlineGraceDays: 7,
  ...overrides,
});

test('serializeLicense mempertahankan trial aktif dan masa cache offline', () => {
  const result = serializeLicense(
    baseLicense(),
    new Date('2026-08-06T00:00:00.000Z')
  );

  assert.equal(result.status, 'ACTIVE');
  assert.equal(result.isActive, true);
  assert.equal(result.plan, 'TRIAL');
  assert.equal(result.daysRemaining, 9);
  assert.equal(result.offlineGraceDays, 7);
});

test('serializeLicense mengunci lisensi yang kedaluwarsa atau ditangguhkan', () => {
  const now = new Date('2026-08-16T00:00:00.000Z');
  const expired = serializeLicense(baseLicense(), now);
  const suspended = serializeLicense(baseLicense({ state: 'SUSPENDED', expiresAt: null }), now);

  assert.equal(expired.status, 'EXPIRED');
  assert.equal(expired.isActive, false);
  assert.equal(expired.daysRemaining, 0);
  assert.equal(suspended.status, 'SUSPENDED');
  assert.equal(suspended.isActive, false);
});

test('normalizeActivationCode menerima pemisah tanpa mengubah isi kode', () => {
  assert.equal(normalizeActivationCode(' lp1-abcd ef12 '), 'LP1ABCDEF12');
});
