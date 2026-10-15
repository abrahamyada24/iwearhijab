export const normalizeStoreId = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const shouldResetTenantCache = (
    cachedStoreId: unknown,
    activeStoreId: unknown
): boolean => {
    const active = normalizeStoreId(activeStoreId);
    if (!active) throw new Error('Store aktif tidak valid.');
    return normalizeStoreId(cachedStoreId) !== active;
};

export const assertTenantResponse = (
    expectedStoreId: unknown,
    responseStoreId: unknown
): number => {
    const expected = normalizeStoreId(expectedStoreId);
    const received = normalizeStoreId(responseStoreId);
    if (!expected || !received || expected !== received) {
        throw new Error('Sinkronisasi dibatalkan karena respons berasal dari usaha yang berbeda.');
    }
    return expected;
};
