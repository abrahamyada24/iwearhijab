import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getApiBaseUrl } from './api';
import { clearAuthSession } from './secureAuthStorage';

const DEVICE_SETTINGS_KEY = '@litepos_saas_device_settings';

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
        storeName: settings?.storeName || 'LitePOS',
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

export const fetchSaasBootstrap = async () => {
    const [me, settings, loyalty, license, currentShift] = await Promise.all([
        api.get('/auth/me'),
        api.get('/settings'),
        api.get('/settings/loyalty'),
        api.get('/license/status'),
        api.get('/shifts/current'),
    ]);
    const normalizedSettings = await normalizeServerSettings(settings.data?.data, loyalty.data?.data);
    const licenseData = license.data?.data;
    return {
        user: me.data?.user,
        settings: {
            ...normalizedSettings,
            license_number: licenseData?.licenseNumber || '',
            license_status: licenseData?.status || 'UNKNOWN',
            license_expire_date: licenseData?.expiresAt || '',
            license_type: licenseData?.plan || 'TRIAL',
            license_offline: false,
        },
        license: licenseData,
        shiftEnabled: currentShift.data?.enabled !== false,
        activeShift: currentShift.data?.data || null,
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

export const createTransaction = async (payload: any) => {
    const response = await api.post('/transactions', payload);
    return response.data?.data;
};

export const logoutSaas = async () => {
    try {
        await api.post('/auth/logout');
    } finally {
        await clearAuthSession();
    }
};
