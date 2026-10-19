const test = require('node:test');
const assert = require('node:assert/strict');

// The dedicated registration boundary must work without any database access.
process.env.DATABASE_URL = 'mysql://unused:unused@127.0.0.1:1/unused';
process.env.JWT_SECRET = 'test-only-dedicated-registration-secret';
process.env.NODE_ENV = 'test';
const app = require('../src/app');
const { basePrisma } = require('../src/config/prisma');

test('instalasi dedicated menolak pendaftaran usaha publik sebelum mengakses database', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    for (const setting of [undefined, 'false', 'TRUE']) {
      if (setting === undefined) delete process.env.PUBLIC_BUSINESS_REGISTRATION;
      else process.env.PUBLIC_BUSINESS_REGISTRATION = setting;
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/register-business`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      assert.equal(response.status, 403);
      assert.match((await response.json()).message, /dinonaktifkan/);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
    await basePrisma.$disconnect();
  }
});
