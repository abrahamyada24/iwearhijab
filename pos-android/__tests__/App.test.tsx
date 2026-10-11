/**
 * @format
 */

import {
  buildApiBaseUrl,
  DEFAULT_API_URL,
  normalizeApiBaseUrl,
} from '../src/services/api';

describe('konfigurasi backend Android', () => {
  test('menggunakan backend produksi yang sama dengan website', () => {
    expect(DEFAULT_API_URL).toBe('https://litepos-demo-api.vercel.app');
    expect(buildApiBaseUrl(DEFAULT_API_URL)).toBe('https://litepos-demo-api.vercel.app/api');
  });

  test('mempertahankan alamat backend SaaS yang tersimpan', () => {
    expect(normalizeApiBaseUrl('https://litepos-demo-api.vercel.app')).toBe(DEFAULT_API_URL);
  });

  test('menormalkan URL custom tanpa menggandakan suffix api', () => {
    expect(normalizeApiBaseUrl('https://pos.example.com/api/')).toBe('https://pos.example.com');
  });
});
