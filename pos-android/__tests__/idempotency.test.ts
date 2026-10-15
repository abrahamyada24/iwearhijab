import { createIdempotencyKey, fingerprintPayload } from '../src/utils/idempotency';

describe('idempotency checkout Android', () => {
    test('membuat key yang valid dan berbeda untuk operasi baru', () => {
        const first = createIdempotencyKey('checkout');
        const second = createIdempotencyKey('checkout');

        expect(first).toMatch(/^checkout-[A-Za-z0-9-]{8,63}$/);
        expect(first.length).toBeLessThanOrEqual(64);
        expect(second).not.toBe(first);
    });

    test('fingerprint tetap sama untuk payload retry yang sama', () => {
        const payload = { items: [{ productId: 1, qty: 2 }], payment: { type: 'CASH' } };
        expect(fingerprintPayload(payload)).toBe(fingerprintPayload(payload));
        expect(fingerprintPayload(payload)).not.toBe(fingerprintPayload({ ...payload, payment: { type: 'TRANSFER' } }));
    });
});
