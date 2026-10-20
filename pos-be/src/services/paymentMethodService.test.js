const test = require('node:test');
const assert = require('node:assert/strict');
const { resolvePaymentMethod } = require('./paymentMethodService');

test('Cash, QRIS manual, dan Point langsung diselesaikan tanpa gateway', () => {
    for (const paymentType of ['CASH', 'POINT', 'QRIS_MANUAL']) {
        assert.deepEqual(resolvePaymentMethod(paymentType), {
            paymentType,
            isGatewayPayment: false,
            isInstantPayment: true
        });
    }
});

test('Transfer dan QRIS gateway ditolak meskipun klien meminta mengaktifkan gateway', () => {
    for (const type of ['TRANSFER', 'QRIS', 'abc', '']) assert.throws(
        () => resolvePaymentMethod(type, { midtransEnabled: true }),
        error => error.code === 'UNSUPPORTED_PAYMENT_METHOD'
    );
});
