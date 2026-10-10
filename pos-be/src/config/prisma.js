const { PrismaClient } = require('@prisma/client');
const { getActiveStoreId, runWithStore, storeContext } = require('./storeContext');
const { scopeOperationArgs, STORE_SCOPED_MODELS } = require('./storeScope');

const requireStoreId = (model) => {
  const storeId = Number(storeContext.getStore()?.storeId);
  if (!Number.isInteger(storeId) || storeId <= 0) {
    const error = new Error(`Konteks store wajib tersedia untuk operasi ${model}.`);
    error.code = 'STORE_CONTEXT_REQUIRED';
    throw error;
  }
  return storeId;
};

const basePrisma = globalThis.__liteposBasePrisma || new PrismaClient();

const prisma = globalThis.__liteposScopedPrisma || basePrisma.$extends({
  name: 'store-isolation',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!STORE_SCOPED_MODELS.has(model)) return query(args);

        return query(scopeOperationArgs(model, operation, args, requireStoreId(model)));
      },
    },
  },
});

// Gunakan kembali client pada instance serverless yang masih hangat agar setiap
// request tidak membuat connection pool baru ke TiDB.
globalThis.__liteposBasePrisma = basePrisma;
globalThis.__liteposScopedPrisma = prisma;

module.exports = {
  basePrisma,
  getActiveStoreId,
  prisma,
  runWithStore,
  STORE_SCOPED_MODELS,
};
