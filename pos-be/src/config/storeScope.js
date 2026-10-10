const STORE_SCOPED_MODELS = new Set([
  'StoreLicense', 'Category', 'Product', 'Customer', 'Transaction', 'StockMovement',
  'StoreSetting', 'LoyaltyConfig', 'Expense', 'Shift', 'SavedTransaction',
  'StockReceipt', 'ProductAddon', 'DineTable', 'Package', 'Supplier',
]);

const readOrMutationWithWhere = new Set([
  'findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany',
  'count', 'aggregate', 'groupBy', 'update', 'updateMany', 'delete', 'deleteMany', 'upsert',
]);

const scopeOperationArgs = (model, operation, args = {}, storeId) => {
  if (!STORE_SCOPED_MODELS.has(model)) return args;
  const scopedStoreId = Number(storeId);
  if (!Number.isInteger(scopedStoreId) || scopedStoreId <= 0) {
    const error = new Error(`Konteks store wajib tersedia untuk operasi ${model}.`);
    error.code = 'STORE_CONTEXT_REQUIRED';
    throw error;
  }

  const nextArgs = { ...args };
  if (readOrMutationWithWhere.has(operation)) {
    nextArgs.where = { ...(args.where || {}), storeId: scopedStoreId };
  }
  if (operation === 'create') {
    nextArgs.data = { ...(args.data || {}), storeId: scopedStoreId };
  }
  if (operation === 'upsert') {
    nextArgs.create = { ...(args.create || {}), storeId: scopedStoreId };
    nextArgs.update = { ...(args.update || {}), storeId: scopedStoreId };
  }
  if (operation === 'update' || operation === 'updateMany') {
    nextArgs.data = { ...(args.data || {}), storeId: scopedStoreId };
  }
  if (operation === 'createMany' || operation === 'createManyAndReturn') {
    const data = Array.isArray(args.data) ? args.data : [args.data];
    nextArgs.data = data.map((entry) => ({ ...entry, storeId: scopedStoreId }));
  }
  return nextArgs;
};

module.exports = { scopeOperationArgs, STORE_SCOPED_MODELS };
