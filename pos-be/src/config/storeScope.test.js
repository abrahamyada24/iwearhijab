const test = require('node:test');
const assert = require('node:assert/strict');
const { scopeOperationArgs } = require('./storeScope');

test('query selalu dipaksa ke store aktif walau client mengirim storeId lain', () => {
  const scoped = scopeOperationArgs('Product', 'findMany', { where: { storeId: 999, isActive: true } }, 2);
  assert.deepEqual(scoped.where, { storeId: 2, isActive: true });
});

test('create dan createMany tidak dapat menyisipkan data ke store lain', () => {
  const created = scopeOperationArgs('Customer', 'create', { data: { storeId: 999, name: 'A' } }, 3);
  const createdMany = scopeOperationArgs('Category', 'createMany', {
    data: [{ storeId: 999, name: 'A' }, { name: 'B' }],
  }, 3);
  assert.equal(created.data.storeId, 3);
  assert.deepEqual(createdMany.data.map((entry) => entry.storeId), [3, 3]);
});

test('update dan upsert tidak dapat memindahkan record ke store lain', () => {
  const updated = scopeOperationArgs('Product', 'update', {
    where: { id: 10 },
    data: { storeId: 999, name: 'Baru' },
  }, 4);
  const upserted = scopeOperationArgs('StoreSetting', 'upsert', {
    where: { id: 1 },
    create: { storeId: 999 },
    update: { storeId: 999 },
  }, 4);
  assert.equal(updated.data.storeId, 4);
  assert.equal(upserted.create.storeId, 4);
  assert.equal(upserted.update.storeId, 4);
});

test('model tenant tidak boleh dipakai tanpa konteks store', () => {
  assert.throws(
    () => scopeOperationArgs('Transaction', 'deleteMany', {}, null),
    (error) => error.code === 'STORE_CONTEXT_REQUIRED'
  );
});

test('model global tidak diubah oleh store scope', () => {
  const args = { where: { id: 1 } };
  assert.equal(scopeOperationArgs('User', 'findUnique', args, null), args);
});
