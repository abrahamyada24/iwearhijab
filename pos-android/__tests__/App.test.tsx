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
    expect(DEFAULT_API_URL).toBe('http://103.175.221.2:5000');
    expect(buildApiBaseUrl(DEFAULT_API_URL)).toBe('http://103.175.221.2:5000/api');
  });

  test('mempertahankan alamat backend Warna Warni yang tersimpan', () => {
    expect(normalizeApiBaseUrl('http://103.175.221.2:5000')).toBe(DEFAULT_API_URL);
  });

  test('menormalkan URL custom tanpa menggandakan suffix api', () => {
    expect(normalizeApiBaseUrl('https://pos.example.com/api/')).toBe('https://pos.example.com');
  });
});
