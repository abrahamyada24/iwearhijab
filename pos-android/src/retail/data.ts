import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { useStore } from '../store/useStore';
import { loadDeviceSettings } from '../services/saasDataService';
import { licenseToSettings } from '../services/licenseService';
import { getAuthToken } from '../services/secureAuthStorage';

export async function bootstrapRetail() {
  const token = await getAuthToken();
  if (!token) throw new Error('Sesi sudah berakhir. Masuk kembali.');
  const response = await api.get('/auth/mobile-bootstrap');
  if ((await getAuthToken()) !== token) throw new Error('Sesi telah berubah.');
  const data = response.data?.data;
  if (!data?.user || !data?.license || !data?.settings)
    throw new Error('Data awal aplikasi belum lengkap. Coba lagi.');
  const device = await loadDeviceSettings();
  const server = data.settings;
  const loyalty = data.loyalty || {};
  useStore.getState().setSettings({
    ...useStore.getState().settings,
    ...device,
    storeName: server.storeName || 'Iwearing Hijab',
    storeAddress: server.address || '',
    storePhone: server.phone || '',
    storeLogo: server.logoUrl || null,
    showImages: server.showImages !== false,
    allowNegativeStock: false,
    receiptFooter: server.receiptFooter || '',
    taxRate: Number(server.taxRate || 0),
    serviceCharge: 0,
    enableShift: server.enableShift !== false,
    enableShiftReminder: server.enableShiftReminder !== false,
    shiftDurationMinutes: Number(server.shiftDurationMinutes || 480),
    shiftReminderMinutes: Number(server.shiftReminderMinutes ?? 15),
    shiftDayCutoff: server.shiftDayCutoff || '23:50',
    enablePreOrder: false,
    enableDineTable: false,
    enableTableOrder: false,
    enableKitchenQueue: false,
    enableKitchenPrint: false,
    loyalty_active: Boolean(loyalty.isActive),
    loyalty_multiplier: Number(loyalty.pointMultiplier || 1),
    loyalty_multiplier_amount: Number(loyalty.multiplierAmount || 25000),
    loyalty_min_points: Number(loyalty.minRedemptionPoints || 10),
    loyalty_point_value: Number(loyalty.pointValue || 100),
    loyalty_earning_mode: 'TRANSACTION_THRESHOLD',
    loyalty_redemption_mode: 'FREE_PRODUCT',
    ...licenseToSettings(data.license),
  });
  await AsyncStorage.setItem('@auth_user', JSON.stringify(data.user));
  const previous = useStore.getState().user;
  if (
    !previous ||
    previous.id !== data.user.id ||
    previous.activeStoreId !== data.user.activeStoreId
  )
    useStore.getState().clearCart();
  useStore.getState().setUser(data.user);
  useStore
    .getState()
    .setActiveShift(
      data.activeShift
        ? { ...data.activeShift, id: String(data.activeShift.id) }
        : null,
    );
  return data;
}

export function validatedDates(start: string, end: string) {
  const valid = (value: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
  if (!valid(start) || !valid(end) || start > end)
    throw new Error('Isi rentang tanggal YYYY-MM-DD yang valid.');
  return { startDate: start, endDate: end };
}
