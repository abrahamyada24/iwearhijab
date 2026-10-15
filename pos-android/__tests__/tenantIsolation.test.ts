import {
    assertTenantResponse,
    normalizeStoreId,
    shouldResetTenantCache,
} from '../src/utils/tenantIsolation';

describe('isolasi cache antar-usaha', () => {
    test('store id hanya menerima bilangan bulat positif', () => {
        expect(normalizeStoreId('12')).toBe(12);
        expect(normalizeStoreId(0)).toBeNull();
        expect(normalizeStoreId('abc')).toBeNull();
    });

    test('cache dibersihkan ketika pengguna berpindah usaha', () => {
        expect(shouldResetTenantCache(1, 1)).toBe(false);
        expect(shouldResetTenantCache(1, 2)).toBe(true);
        expect(shouldResetTenantCache(null, 2)).toBe(true);
    });

    test('respons tenant lain selalu ditolak sebelum ditulis ke cache', () => {
        expect(assertTenantResponse(7, '7')).toBe(7);
        expect(() => assertTenantResponse(7, 8)).toThrow(/usaha yang berbeda/i);
        expect(() => assertTenantResponse(7, null)).toThrow(/usaha yang berbeda/i);
    });
});
