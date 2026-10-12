import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { isSaasOnlineMode } from '../config/appMode';
import { clearAuthSession, getAuthToken, OFFLINE_SESSION_TOKEN } from './secureAuthStorage';

// Backend SaaS LitePOS. Registrasi usaha tetap dilakukan melalui website.
// URL dapat diganti dari Pengaturan untuk instalasi dedicated.
export const DEFAULT_API_URL = 'https://litepos-demo-api.vercel.app';
export const API_BASE_URL_STORAGE_KEY = '@litepos_api_base_url';
export const API_URL = DEFAULT_API_URL;

const stripApiSuffix = (url: string) => url.replace(/\/api\/?$/i, '');

export const normalizeApiBaseUrl = (value?: string | null) => {
    const trimmed = (value || '').trim();
    if (!trimmed) return DEFAULT_API_URL;

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    return stripApiSuffix(withProtocol).replace(/\/+$/, '');
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
    // Edisi SaaS publik tidak boleh diarahkan ke server lain melalui nilai lama
    // di penyimpanan perangkat. Ini juga mencegah JWT terkirim ke host custom.
    if (isSaasOnlineMode) return DEFAULT_API_URL;
    const savedUrl = await AsyncStorage.getItem(API_BASE_URL_STORAGE_KEY);
    const normalized = normalizeApiBaseUrl(savedUrl);

    return normalized;
};

const api = axios.create({
    baseURL: buildApiBaseUrl(DEFAULT_API_URL),
    timeout: 10000, // 10 detik timeout
    headers: {
        'Content-Type': 'application/json',
    }
});

// Satu gangguan koneksi bisa menggagalkan beberapa request bootstrap sekaligus.
// Batasi dialog agar pengguna tidak menerima tumpukan alert yang sama.
let lastConnectivityAlertAt = 0;
const CONNECTIVITY_ALERT_COOLDOWN_MS = 15000;

const isConnectivityError = (error: any) => {
    if (error?.response) return false;
    const code = String(error?.code || '').toUpperCase();
    const message = String(error?.message || '').toLowerCase();
    return code === 'ERR_NETWORK'
        || code === 'ECONNABORTED'
        || message.includes('network error')
        || message.includes('timeout');
};

export const showApiError = (title: string, error: any, fallbackMessage: string) => {
    // Error koneksi sudah ditampilkan secara terpusat oleh interceptor.
    if (error?.__litePosConnectivityAlert) return;
    Alert.alert(
        title,
        error?.response?.data?.message || error?.response?.data?.error || fallbackMessage,
    );
};

export const setApiBaseUrl = async (value: string) => {
    if (isSaasOnlineMode) {
        await AsyncStorage.removeItem(API_BASE_URL_STORAGE_KEY);
        api.defaults.baseURL = buildApiBaseUrl(DEFAULT_API_URL);
        return DEFAULT_API_URL;
    }
    const normalized = normalizeApiBaseUrl(value);
    const previous = normalizeApiBaseUrl(await AsyncStorage.getItem(API_BASE_URL_STORAGE_KEY));

    // JWT hanya valid untuk backend yang menerbitkannya. Saat server diganti,
    // buang sesi online lama agar token tidak terkirim ke instalasi lain.
    if (previous !== normalized) {
        const token = await getAuthToken();
        if (token && token !== OFFLINE_SESSION_TOKEN) {
            await clearAuthSession();
        }
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

api.interceptors.response.use(
    response => response,
    error => {
        if (isConnectivityError(error)) {
            error.__litePosConnectivityAlert = true;
            const now = Date.now();
            if (now - lastConnectivityAlertAt >= CONNECTIVITY_ALERT_COOLDOWN_MS) {
                lastConnectivityAlertAt = now;
                Alert.alert(
                    'Tidak Ada Koneksi',
                    'LitePOS SaaS memerlukan internet. Periksa koneksi perangkat atau coba lagi beberapa saat.',
                );
            }
        }
        return Promise.reject(error);
    },
);

export default api;
