import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTransaction } from '../services/saasDataService';
import { createIdempotencyKey, fingerprintPayload } from '../utils/idempotency';

type PendingCheckout = {
  key: string;
  fingerprint: string;
  payload: any;
  receiptFallback: any;
};
const storageKey = (user: any) => {
  if (!user?.id || !user?.activeStoreId)
    throw new Error('Sesi toko tidak valid. Masuk kembali.');
  return `@iwear_pending_checkout:${user.activeStoreId}:${user.id}`;
};
export async function getPendingCheckout(
  user: any,
): Promise<PendingCheckout | null> {
  const raw = await AsyncStorage.getItem(storageKey(user));
  return raw ? JSON.parse(raw) : null;
}
export async function sendCheckout(
  user: any,
  payload?: any,
  receiptFallback?: any,
) {
  const key = storageKey(user);
  let pending = await getPendingCheckout(user);
  if (
    pending &&
    payload &&
    pending.fingerprint !== fingerprintPayload(payload)
  ) {
    throw new Error(
      'Masih ada transaksi yang belum terkonfirmasi. Gunakan Lanjutkan Transaksi Sebelumnya di Beranda sebelum membuat transaksi baru.',
    );
  }
  if (!pending) {
    if (!payload) throw new Error('Tidak ada transaksi tertunda.');
    pending = {
      key: createIdempotencyKey('checkout'),
      fingerprint: fingerprintPayload(payload),
      payload,
      receiptFallback,
    };
    // Persist before the HTTP request. A timeout or process restart must reuse
    // the original payload and key so stock and points cannot be deducted twice.
    await AsyncStorage.setItem(key, JSON.stringify(pending));
  }
  try {
    const transaction = await createTransaction(pending.payload, pending.key);
    if (!transaction?.id)
      throw new Error('Server belum mengakui transaksi. Coba lagi.');
    await AsyncStorage.removeItem(key);
    return { transaction, receiptFallback: pending.receiptFallback };
  } catch (error: any) {
    if ([400, 422].includes(error.response?.status)) {
      await AsyncStorage.removeItem(key);
    }
    throw error;
  }
}
