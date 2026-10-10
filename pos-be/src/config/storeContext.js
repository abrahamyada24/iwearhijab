const { AsyncLocalStorage } = require('async_hooks');

const storeContext = new AsyncLocalStorage();

const runWithStore = (storeId, callback) => storeContext.run({ storeId: Number(storeId) }, callback);
const getActiveStoreId = () => Number(storeContext.getStore()?.storeId) || null;

module.exports = { getActiveStoreId, runWithStore, storeContext };
