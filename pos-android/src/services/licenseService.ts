import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { getApiBaseUrl } from './api';
import { getDBConnection } from '../database/db';

const LICENSE_CACHE_KEY = '@litepos_license_cache';

export type LicenseStatus = {
    licenseNumber: string | null;
    plan: 'TRIAL' | 'PREMIUM' | 'UNKNOWN';
    status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'UNKNOWN';
    isActive: boolean;
    startsAt?: string | null;
    expiresAt: string | null;
    activatedAt?: string | null;
    activationSource?: string | null;
    offlineGraceDays: number;
    daysRemaining: number | null;
    serverTime: string;
    cachedAt?: string;
    offline?: boolean;
};

type CachedLicenseStatus = LicenseStatus & {
    cachedAt: string;
    apiBaseUrl: string;
};

const unknownLicense = (): LicenseStatus => ({
    licenseNumber: null,
    plan: 'UNKNOWN',
    status: 'UNKNOWN',
    isActive: false,
    expiresAt: null,
    offlineGraceDays: 7,
    daysRemaining: null,
    serverTime: new Date().toISOString(),
    offline: true,
});

export const licenseToSettings = (license: LicenseStatus) => ({
    license_number: license.licenseNumber || '',
    license_status: license.status,
    license_type: license.plan === 'UNKNOWN' ? 'TRIAL' : license.plan,
    license_expire_date: license.expiresAt || '',
    license_offline: Boolean(license.offline),
});

const cacheLicenseStatus = async (license: LicenseStatus) => {
    const apiBaseUrl = await getApiBaseUrl();
    await AsyncStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify({
        ...license,
        cachedAt: new Date().toISOString(),
        apiBaseUrl,
    }));
};

const getCachedLicenseStatus = async (): Promise<LicenseStatus | null> => {
    try {
        const raw = await AsyncStorage.getItem(LICENSE_CACHE_KEY);
        if (!raw) return null;
        const license = JSON.parse(raw) as CachedLicenseStatus;
        const apiBaseUrl = await getApiBaseUrl();
        if (!license.apiBaseUrl || license.apiBaseUrl !== apiBaseUrl) return null;
        const now = Date.now();
        const cachedAt = new Date(license.cachedAt || '').getTime();
        const serverTime = new Date(license.serverTime || '').getTime();
        const expiresAt = license.expiresAt ? new Date(license.expiresAt).getTime() : null;
        const graceMs = Math.max(0, Number(license.offlineGraceDays || 0)) * 24 * 60 * 60 * 1000;
        const clockRolledBack = Number.isFinite(serverTime) && now + 5 * 60 * 1000 < serverTime;
        const graceExpired = !Number.isFinite(cachedAt) || now - cachedAt > graceMs;
        const licenseExpired = expiresAt !== null && (!Number.isFinite(expiresAt) || now >= expiresAt);

        if (!license.isActive || clockRolledBack || graceExpired || licenseExpired) {
            return {
                ...license,
                status: license.status === 'SUSPENDED' ? 'SUSPENDED' : license.status === 'UNKNOWN' ? 'UNKNOWN' : 'EXPIRED',
                isActive: false,
                offline: true,
            };
        }
        return { ...license, offline: true };
    } catch {
        await AsyncStorage.removeItem(LICENSE_CACHE_KEY).catch(() => undefined);
        return null;
    }
};

const persistLicenseStatus = async (license: LicenseStatus) => {
    try {
        const db = await getDBConnection();
        for (const [key, value] of Object.entries(licenseToSettings(license))) {
            await db.executeSql(
                'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                [key, String(value)]
            );
        }
    } catch (error) {
        console.warn('Status lisensi belum dapat disimpan ke SQLite:', error);
    }
};

export const fetchLicenseStatus = async (): Promise<LicenseStatus> => {
    const response = await api.get('/license/status');
    if (!response.data?.success || !response.data?.data) {
        throw new Error('Status lisensi tidak tersedia.');
    }
    const license = response.data.data as LicenseStatus;
    await Promise.allSettled([cacheLicenseStatus(license), persistLicenseStatus(license)]);
    return { ...license, offline: false };
};

export const resolveLicenseStatus = async (): Promise<LicenseStatus> => {
    try {
        return await fetchLicenseStatus();
    } catch {
        const license = await getCachedLicenseStatus() || unknownLicense();
        await persistLicenseStatus(license);
        return license;
    }
};

export const activateLicense = async (code: string): Promise<LicenseStatus> => {
    const response = await api.post('/license/activate', { code });
    if (!response.data?.success || !response.data?.data) {
        throw new Error(response.data?.message || 'Aktivasi lisensi gagal.');
    }
    const license = response.data.data as LicenseStatus;
    await Promise.allSettled([cacheLicenseStatus(license), persistLicenseStatus(license)]);
    return { ...license, offline: false };
};
