jest.mock('../src/services/saasDataService', () => ({
  createTransaction: jest.fn(),
}));
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTransaction } from '../src/services/saasDataService';
import {
  getPendingCheckout,
  sendCheckout,
} from '../src/retail/checkoutRequest';
const create = createTransaction as jest.Mock;
const user = { id: 1, activeStoreId: 10 };
const payload = {
  customerId: 7,
  items: [{ productId: 3, qty: 1 }],
  payment: { type: 'CASH', cashAmount: 50000 },
};
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});
test('timeout dan restart mengulang key/payload yang sama; server hanya membuat satu transaksi', async () => {
  create
    .mockRejectedValueOnce(new Error('timeout'))
    .mockResolvedValueOnce({ id: 50 });
  await expect(
    sendCheckout(user, payload, { customerPhone: '08123' }),
  ).rejects.toThrow('timeout');
  const persisted = await getPendingCheckout(user);
  expect(persisted?.payload).toEqual(payload);
  const result = await sendCheckout(user);
  expect(create.mock.calls[1]).toEqual(create.mock.calls[0]);
  expect(result.receiptFallback.customerPhone).toBe('08123');
  expect(await getPendingCheckout(user)).toBeNull();
});
test('permintaan tertunda tidak boleh diganti atau dipakai lintas akun/toko', async () => {
  create.mockRejectedValue(new Error('timeout'));
  await expect(sendCheckout(user, payload)).rejects.toThrow('timeout');
  await expect(
    sendCheckout(user, { ...payload, customerId: 8 }),
  ).rejects.toThrow('transaksi yang belum terkonfirmasi');
  expect(create).toHaveBeenCalledTimes(1);
  expect(await getPendingCheckout({ ...user, activeStoreId: 20 })).toBeNull();
  expect(await getPendingCheckout({ ...user, id: 2 })).toBeNull();
});
test('penolakan validasi definitif menghapus permintaan; kegagalan server tetap bisa dicoba ulang', async () => {
  create.mockRejectedValueOnce({ response: { status: 400 } });
  await expect(sendCheckout(user, payload)).rejects.toBeDefined();
  expect(await getPendingCheckout(user)).toBeNull();
  create.mockRejectedValueOnce({ response: { status: 500 } });
  await expect(sendCheckout(user, payload)).rejects.toBeDefined();
  expect(await getPendingCheckout(user)).not.toBeNull();
  create.mockRejectedValueOnce({ response: { status: 401 } });
  await expect(sendCheckout(user)).rejects.toBeDefined();
  expect(await getPendingCheckout(user)).not.toBeNull();
});
