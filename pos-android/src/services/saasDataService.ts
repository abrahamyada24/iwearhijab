import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getApiBaseUrl } from './api';
import { clearAuthSession } from './secureAuthStorage';

const DEVICE_SETTINGS_KEY = '@kasirpos_saas_device_settings';

export type SaasDeviceSettings = {
    printerAddress: string | null;
    printerType: 'BLE' | 'USB' | null;
    theme: 'light' | 'dark';
    showLogoOnReceipt: boolean;
};

const defaultDeviceSettings: SaasDeviceSettings = {
    printerAddress: null,
    printerType: null,
    theme: 'light',
    showLogoOnReceipt: true,
};

export const loadDeviceSettings = async (): Promise<SaasDeviceSettings> => {
    try {
        const raw = await AsyncStorage.getItem(DEVICE_SETTINGS_KEY);
        return raw ? { ...defaultDeviceSettings, ...JSON.parse(raw) } : defaultDeviceSettings;
    } catch {
        return defaultDeviceSettings;
    }
};

export const saveDeviceSettings = async (settings: SaasDeviceSettings) => {
    await AsyncStorage.setItem(DEVICE_SETTINGS_KEY, JSON.stringify(settings));
};

export const normalizeServerSettings = async (settings: any, loyalty: any = {}, device?: SaasDeviceSettings) => {
    const local = device || await loadDeviceSettings();
    return {
        storeName: settings?.storeName || 'KasirPOS',
        storeAddress: settings?.address || '',
        storePhone: settings?.phone || '',
        storeLogo: settings?.logoUrl || null,
        enablePreOrder: Boolean(settings?.enablePreOrder),
        enableShift: settings?.enableShift !== false,
        enableDineTable: false,
        enableTableOrder: false,
        enableKitchenQueue: false,
        enableKitchenPrint: false,
        showImages: settings?.showImages !== false,
        printerAddress: local.printerAddress,
        printerType: local.printerType,
        theme: local.theme,
        allowNegativeStock: Boolean(settings?.allowNegativeStock),
        showLogoOnReceipt: local.showLogoOnReceipt,
        receiptFooter: settings?.receiptFooter || '',
        loyalty_active: Boolean(loyalty?.isActive),
        loyalty_multiplier: Number(loyalty?.pointMultiplier || 1),
        loyalty_multiplier_amount: Number(loyalty?.multiplierAmount || 10000),
        loyalty_point_value: Number(loyalty?.pointValue || 100),
        loyalty_min_points: Number(loyalty?.minRedemptionPoints || 10),
        license_number: '',
        license_status: 'UNKNOWN' as const,
        license_expire_date: '',
        license_type: 'TRIAL' as const,
        license_offline: false,
        apiBaseUrl: await getApiBaseUrl(),
    };
};

const getActiveStoreName = (user: any) => {
    const activeStoreId = Number(user?.activeStoreId);
    const activeStore = Array.isArray(user?.stores)
        ? user.stores.find((store: any) => Number(store?.id) === activeStoreId)
        : null;
    return activeStore?.name || 'KasirPOS';
};

export const createCachedSaasBootstrap = async (user: any) => ({
    user,
    settings: {
        ...await normalizeServerSettings({
            storeName: getActiveStoreName(user),
            // Jangan memblokir POS dengan dialog buka shift sebelum konfigurasi
            // server selesai diperbarui di belakang layar.
            enableShift: false,
        }),
        license_status: 'ACTIVE' as const,
    },
    license: { isActive: true, status: 'ACTIVE' },
    shiftEnabled: false,
    activeShift: null,
});

export const fetchSaasBootstrap = async () => {
    let bootstrap: any;

    try {
        // Jalur cepat. Batasi tujuh detik karena sesudah login instance Vercel
        // semestinya sudah hangat. Jika endpoint khusus ini bermasalah, Android
        // otomatis memakai endpoint stabil yang juga digunakan website.
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 7000);
        try {
            const response = await api.get('/auth/mobile-bootstrap', { signal: controller.signal });
            bootstrap = response.data?.data || {};
        } finally {
            clearTimeout(timer);
        }
    } catch (error: any) {
        const status = error?.response?.status;
        if (status === 401 || status === 403) throw error;

        // /auth/me berada di jalur autentikasi ringan dan menjadi satu-satunya
        // data wajib. Endpoint konfigurasi bersifat opsional: kegagalan salah
        // satunya tidak boleh mengunci pengguna di layar pemuatan.
        const me = await api.get('/auth/me');
        const [settings, loyalty, license, currentShift] = await Promise.allSettled([
            api.get('/settings'),
            api.get('/settings/loyalty'),
            api.get('/license/status'),
            api.get('/shifts/current'),
        ]);
        const responseData = (result: PromiseSettledResult<any>) => result.status === 'fulfilled'
            ? result.value.data
            : undefined;
        const settingsData = responseData(settings);
        const loyaltyData = responseData(loyalty);
        const licenseResponse = responseData(license);
        const shiftData = responseData(currentShift);
        bootstrap = {
            user: me.data?.user,
            settings: settingsData?.data || { storeName: getActiveStoreName(me.data?.user), enableShift: false },
            loyalty: loyaltyData?.data,
            // Otorisasi lisensi tetap dilakukan backend untuk setiap endpoint
            // bisnis. Nilai sementara ini hanya mencegah UI terkunci bila endpoint
            // status sedang lambat.
            license: licenseResponse?.data || { isActive: true, status: 'UNKNOWN', plan: 'TRIAL' },
            shiftEnabled: shiftData?.enabled === true,
            activeShift: shiftData?.data || null,
        };
    }

    const normalizedSettings = await normalizeServerSettings(bootstrap.settings, bootstrap.loyalty);
    const licenseData = bootstrap.license;
    return {
        user: bootstrap.user,
        settings: {
            ...normalizedSettings,
            license_number: licenseData?.licenseNumber || '',
            license_status: licenseData?.status || 'UNKNOWN',
            license_expire_date: licenseData?.expiresAt || '',
            license_type: licenseData?.plan || 'TRIAL',
            license_offline: false,
        },
        license: licenseData,
        shiftEnabled: bootstrap.shiftEnabled !== false,
        activeShift: bootstrap.activeShift || null,
    };
};

export const fetchProducts = async (params: Record<string, unknown> = {}) => {
    const response = await api.get('/products', { params });
    return response.data?.data || [];
};

export const fetchCategories = async () => {
    const response = await api.get('/products/categories');
    return response.data?.data || [];
};

export const fetchCustomers = async (search = '') => {
    const response = await api.get('/customers', { params: search ? { search } : {} });
    return response.data?.data || [];
};

export const fetchDashboard = async (period = 'month') => {
    const response = await api.get('/reports/dashboard', { params: { period } });
    return response.data?.data || {};
};

export const fetchTransactions = async (page = 1, limit = 50) => {
    const response = await api.get('/transactions', { params: { page, limit } });
    return response.data || { data: [], meta: {} };
};

export const createTransaction = async (payload: any, idempotencyKey?: string) => {
    const response = await api.post('/transactions', payload, {
        headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
    return response.data?.data;
};

export const logoutSaas = async () => {
    try {
        await api.post('/auth/logout');
    } catch {
        // Token yang kedaluwarsa memang dapat membuat endpoint logout menolak.
        // Sesi perangkat tetap wajib dibersihkan agar navigasi kembali ke login.
    } finally {
        await clearAuthSession();
    }
};
