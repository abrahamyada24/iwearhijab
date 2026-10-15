const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateExtendedExpiry,
  generateActivationCode,
} = require('./platformAdminService');

test('perpanjangan dimulai dari tanggal kedaluwarsa jika lisensi masih aktif', () => {
  const now = new Date('2026-10-14T00:00:00.000Z');
  const currentExpiry = new Date('2026-10-20T00:00:00.000Z');
  assert.equal(calculateExtendedExpiry(currentExpiry, 30, now).toISOString(), '2026-11-19T00:00:00.000Z');
});

test('perpanjangan dimulai dari sekarang jika lisensi telah berakhir', () => {
  const now = new Date('2026-10-14T00:00:00.000Z');
  const currentExpiry = new Date('2026-10-01T00:00:00.000Z');
  assert.equal(calculateExtendedExpiry(currentExpiry, 30, now).toISOString(), '2026-11-13T00:00:00.000Z');
});

test('token aktivasi memakai format acak yang mudah disalin', () => {
  const first = generateActivationCode();
  const second = generateActivationCode();
  assert.match(first, /^LPD-(?:[A-F0-9]{4}-){4}[A-F0-9]{4}$/);
  assert.notEqual(first, second);
});

test('retry token dengan Idempotency-Key menghasilkan kode yang sama', () => {
  const previousSecret = process.env.PLATFORM_ADMIN_JWT_SECRET;
  process.env.PLATFORM_ADMIN_JWT_SECRET = 'platform-test-secret-that-is-long-enough';
  try {
    const first = generateActivationCode('request-token-1234');
    const retry = generateActivationCode('request-token-1234');
    const other = generateActivationCode('request-token-5678');
    assert.equal(first, retry);
    assert.notEqual(first, other);
  } finally {
    if (previousSecret === undefined) delete process.env.PLATFORM_ADMIN_JWT_SECRET;
    else process.env.PLATFORM_ADMIN_JWT_SECRET = previousSecret;
  }
});
