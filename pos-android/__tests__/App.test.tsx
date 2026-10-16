/**
 * @format
 */

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' },
  setGenericPassword: jest.fn(async () => true),
  getGenericPassword: jest.fn(async () => false),
  resetGenericPassword: jest.fn(async () => true),
}));

import {
  buildApiBaseUrl,
  DEFAULT_API_URL,
  normalizeApiBaseUrl,
} from '../src/services/api';
import { APP_MODE, isSaasOnlineMode } from '../src/config/appMode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL_STORAGE_KEY, getApiBaseUrl } from '../src/services/api';
import { KASIRPOS_API_ORIGIN } from '../src/config/deployment';

describe('konfigurasi backend Android', () => {
  test('menggunakan backend produksi yang sama dengan website', () => {
    expect(DEFAULT_API_URL).toBe(KASIRPOS_API_ORIGIN);
    expect(buildApiBaseUrl(DEFAULT_API_URL)).toBe(`${KASIRPOS_API_ORIGIN}/api`);
  });

  test('mempertahankan alamat backend SaaS yang tersimpan', () => {
    expect(normalizeApiBaseUrl(KASIRPOS_API_ORIGIN)).toBe(DEFAULT_API_URL);
  });

  test('menormalkan URL custom tanpa menggandakan suffix api', () => {
    expect(normalizeApiBaseUrl('https://pos.example.com/api/')).toBe('https://pos.example.com');
  });

  test('menjalankan edisi SaaS online tanpa bootstrap database SQLite', () => {
    expect(APP_MODE).toBe('SAAS_ONLINE');
    expect(isSaasOnlineMode).toBe(true);
  });

  test('mengabaikan URL custom tersimpan pada edisi SaaS publik', async () => {
    await AsyncStorage.setItem(API_BASE_URL_STORAGE_KEY, 'http://server-tidak-tepercaya.test');
    await expect(getApiBaseUrl()).resolves.toBe(DEFAULT_API_URL);
  });
});
