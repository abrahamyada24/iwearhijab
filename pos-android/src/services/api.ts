import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAuthSession, getAuthToken, OFFLINE_SESSION_TOKEN } from './secureAuthStorage';
import { clearLicenseCache } from './secureLicenseStorage';

export const DEFAULT_API_URL = 'https://litepos-demo-api.vercel.app';
export const API_BASE_URL_STORAGE_KEY = '@litepos_api_base_url';
export const API_URL = DEFAULT_API_URL;

const LEGACY_API_URLS = new Set([
    'http://103.175.221.2:5000',
]);

const stripApiSuffix = (url: string) => url.replace(/\/api\/?$/i, '');

export const normalizeApiBaseUrl = (value?: string | null) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return DEFAULT_API_URL;

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    const normalized = stripApiSuffix(withProtocol).replace(/\/+$/, '');
    return LEGACY_API_URLS.has(normalized) ? DEFAULT_API_URL : normalized;
};

export const buildApiBaseUrl = (baseUrl: string) => `${normalizeApiBaseUrl(baseUrl)}/api`;

export const isDeviceAssetUrl = (value?: string | null) => {
    if (!value) return false;
    return /^(file|content|ph|assets-library):\/\//i.test(value);
};

export const resolveApiAssetUrl = (value?: string | null, baseUrl?: string | null) => {
    const assetUrl = (value || '').trim();
    if (!assetUrl) return null;

    if (/^(https?:|data:|file:|content:|ph:|assets-library:)/i.test(assetUrl)) {
        return assetUrl;
    }

    const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
    return `${normalizedBaseUrl}/${assetUrl.replace(/^\/+/, '')}`;
};

export const getApiBaseUrl = async () => {
    const savedUrl = await AsyncStorage.getItem(API_BASE_URL_STORAGE_KEY);
    const normalized = normalizeApiBaseUrl(savedUrl);

    // APK demo publik hanya boleh mengirim JWT dan data tenant ke backend demo
    // resmi. Dukungan URL custom tetap milik build dedicated di AndroidPos-web.
    if (normalized !== DEFAULT_API_URL) {
        await AsyncStorage.setItem(API_BASE_URL_STORAGE_KEY, DEFAULT_API_URL);
        await clearAuthSession();
        await clearLicenseCache();
        return DEFAULT_API_URL;
    }

    if (savedUrl && LEGACY_API_URLS.has(stripApiSuffix(savedUrl.trim()).replace(/\/+$/, ''))) {
        await AsyncStorage.setItem(API_BASE_URL_STORAGE_KEY, normalized);
        await clearAuthSession();
        await clearLicenseCache();
    }

    return normalized;
};

const api = axios.create({
    baseURL: buildApiBaseUrl(DEFAULT_API_URL),
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    }
});

export const showApiError = (title: string, error: any, fallbackMessage: string) => {
    const message = error?.response?.data?.message
        || error?.response?.data?.error
        || (error?.code === 'ECONNABORTED' ? 'Server terlalu lama merespons. Silakan coba lagi.' : null)
        || (error?.response ? null : 'Tidak dapat terhubung ke server. Periksa koneksi internet.')
        || fallbackMessage;
    // Import dinamis mencegah siklus modul pada saat bootstrap Axios.
    require('react-native').Alert.alert(title, String(message));
};

export const setApiBaseUrl = async (value: string) => {
    const normalized = DEFAULT_API_URL;
    const previous = normalizeApiBaseUrl(await AsyncStorage.getItem(API_BASE_URL_STORAGE_KEY));

    // JWT hanya valid untuk backend yang menerbitkannya. Saat server diganti,
    // buang sesi online lama agar token tidak terkirim ke instalasi lain.
    if (previous !== normalized) {
        const token = await getAuthToken();
        if (token && token !== OFFLINE_SESSION_TOKEN) {
            await clearAuthSession();
        }
        await clearLicenseCache();
    }

    await AsyncStorage.setItem(API_BASE_URL_STORAGE_KEY, normalized);
    api.defaults.baseURL = buildApiBaseUrl(normalized);
    return normalized;
};

export const hydrateApiBaseUrl = async () => {
    const normalized = await getApiBaseUrl();
    api.defaults.baseURL = buildApiBaseUrl(normalized);
    return normalized;
};

// Interceptor untuk menyisipkan token JWT ke setiap request
api.interceptors.request.use(
    async (config) => {
        try {
            const baseUrl = await getApiBaseUrl();
            config.baseURL = buildApiBaseUrl(baseUrl);

            const token = await getAuthToken();
            if (token && token !== OFFLINE_SESSION_TOKEN) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error('Gagal mengambil token:', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
