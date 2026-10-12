import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';

const AUTH_TOKEN_SERVICE = 'com.litepos.saas.auth.token';
const LEGACY_AUTH_TOKEN_KEY = '@auth_token';
const LEGACY_AUTH_USER_KEY = '@auth_user';

export const OFFLINE_SESSION_TOKEN = 'offline-mode-token';

export const setAuthToken = async (token: string) => {
    await Keychain.setGenericPassword('litepos', token, {
        service: AUTH_TOKEN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    await AsyncStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
};

export const getAuthToken = async () => {
    const credentials = await Keychain.getGenericPassword({ service: AUTH_TOKEN_SERVICE });
    return credentials ? credentials.password : null;
};

export const clearAuthSession = async () => {
    await Promise.all([
        Keychain.resetGenericPassword({ service: AUTH_TOKEN_SERVICE }),
        AsyncStorage.multiRemove([LEGACY_AUTH_TOKEN_KEY, LEGACY_AUTH_USER_KEY]),
    ]);
};

export const migrateLegacyAuthStorage = async () => {
    const legacyToken = await AsyncStorage.getItem(LEGACY_AUTH_TOKEN_KEY);
    if (legacyToken) {
        // Token lama tersimpan sebagai teks biasa. Jangan memindahkan nilainya;
        // minta pengguna login ulang untuk membuat sesi terenkripsi.
        await clearAuthSession();
    }
};
