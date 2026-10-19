import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw, { useAppColorScheme } from 'twrnc';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import api from '../services/api';
import {
    clearAuthSession,
    loadAuthSession,
    migrateLegacyAuthStorage,
    saveAuthSession,
} from '../services/secureAuthStorage';
import { licenseToSettings, resolveLicenseStatus } from '../services/licenseService';
import { ensureStoreSessionCache } from '../database/db';

export default function LoginScreen({ navigation }: any) {
    useAppColorScheme(tw);
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAutoLogging, setIsAutoLogging] = useState(true);
    const [rememberMe, setRememberMe] = useState(true);
    const setUser = useStore((state) => state.setUser);
    const setSettings = useStore((state) => state.setSettings);

    const activateTenant = async (user: any) => {
        const activeStoreId = Number(user?.activeStoreId);
        const cacheWasReset = await ensureStoreSessionCache(activeStoreId);
        if (!cacheWasReset) return;

        const activeStore = Array.isArray(user?.stores)
            ? user.stores.find((store: any) => Number(store?.id) === activeStoreId)
            : null;
        useStore.getState().clearCart();
        useStore.getState().setActiveShift(null);
        useStore.getState().setTableOrderNotificationCount(0);
        useStore.getState().clearPendingOrderContext();
        setSettings({
            ...useStore.getState().settings,
            storeName: activeStore?.name || 'Iwearing Hijab',
            storeAddress: '',
            storePhone: '',
            storeLogo: null,
            receiptFooter: '',
            taxRate: 0,
            serviceCharge: 0,
            loyalty_active: false,
            license_number: '',
            license_expire_date: '',
            license_status: 'UNKNOWN',
        });
    };

    const continueAfterLicenseCheck = async () => {
        const license = await resolveLicenseStatus();
        setSettings({ ...useStore.getState().settings, ...licenseToSettings(license) });
        navigation.replace(license.isActive ? 'Main' : 'Lock');
    };

    useEffect(() => {
        const tryAutoLogin = async () => {
            try {
                await migrateLegacyAuthStorage();
                const session = await loadAuthSession();
                if (!session) return;

                if (session.offline) {
                    await clearAuthSession();
                    return;
                }

                try {
                    const response = await api.get('/auth/me');
                    if (response.data?.success && response.data?.user) {
                        const freshUser = response.data.user;
                        await activateTenant(freshUser);
                        await AsyncStorage.setItem('@auth_user', JSON.stringify(freshUser));
                        setUser(freshUser);
                        await continueAfterLicenseCheck();
                        return;
                    }
                } catch (error: any) {
                    if (error?.response?.status === 401 || error?.response?.status === 403) {
                        await clearAuthSession();
                        return;
                    }

                    // Mode SaaS demo wajib memvalidasi tenant dan hak akses ke
                    // backend. Sesi cache tidak boleh menggantikan otorisasi server.
                    return;
                }
            } catch (error) {
                console.error('Auto-login error:', error);
                await clearAuthSession();
            } finally {
                setIsAutoLogging(false);
            }
        };
        tryAutoLogin();
    }, [navigation, setUser]);

    const handleLogin = async () => {
        const normalizedIdentifier = identifier.trim().toLowerCase();
        if (!normalizedIdentifier || !password) {
            Alert.alert('Error', 'Email/username dan password harus diisi.');
            return;
        }
        const identifierIsValid = normalizedIdentifier.includes('@')
            ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier)
            : /^[a-z0-9][a-z0-9._-]{2,49}$/.test(normalizedIdentifier);
        if (!identifierIsValid) {
            Alert.alert('Validasi Gagal', 'Masukkan email atau username yang valid.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Validasi Gagal', 'Password minimal 6 karakter.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', {
                identifier: normalizedIdentifier,
                email: normalizedIdentifier,
                password,
                clientType: 'ANDROID',
                deviceName: `Android ${String(Platform.Version)}`,
            });

            if (response.data?.success) {
                const { token, user } = response.data;
                if (user?.mustChangePassword) {
                    try {
                        await api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } });
                    } catch { /* sesi tetap akan kedaluwarsa di server */ }
                    await clearAuthSession();
                    Alert.alert(
                        'Ganti Password Diperlukan',
                        'Masuk ke website Iwearing Hijab dan buat password baru terlebih dahulu, lalu login kembali di Android.'
                    );
                    return;
                }

                await activateTenant(user);
                await saveAuthSession({ token, user, remember: rememberMe });
                setUser(user);

                await continueAfterLicenseCheck();
            }
        } catch (error: any) {
            if (error?.response && error.response.status >= 400 && error.response.status < 500) {
                Alert.alert('Login Gagal', error.response?.data?.message || 'Email/username atau password salah.');
                return;
            }

            Alert.alert('Tidak Ada Koneksi', 'Iwearing Hijab memerlukan internet untuk memvalidasi akun dan data usaha. Periksa koneksi lalu coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isAutoLogging) {
        return (
            <SafeAreaView style={tw`flex-1 justify-center items-center bg-gray-100 dark:bg-gray-800`}>
                <Text style={tw`text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-6`}>Iwearing Hijab</Text>
                <ActivityIndicator size="large" color={tw.color('blue-600')} />
                <Text style={tw`text-gray-500 dark:text-gray-400 mt-4 font-bold text-sm`}>Memuat sesi...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={tw`flex-1 justify-center items-center bg-gray-100 dark:bg-gray-800 p-6`}>
            <View style={tw`items-center mb-8`}>
                <Text style={tw`text-4xl font-black text-center text-gray-900 dark:text-white tracking-tight`}>Iwearing Hijab</Text>
                <Text style={tw`text-sm font-bold text-center text-gray-500 dark:text-gray-400 mt-1`}>Sistem Point of Sale</Text>
            </View>

            <View style={tw`bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-md w-full max-w-sm border border-gray-100 dark:border-gray-800`}>
                <Text style={tw`text-lg text-center text-gray-700 dark:text-gray-200 font-bold mb-6`}>Login POS</Text>
                <TextInput
                    style={tw`bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 mb-4 text-center text-lg font-bold text-gray-900 dark:text-white shadow-sm`}
                    value={identifier}
                    onChangeText={setIdentifier}
                    keyboardType="default"
                    autoCapitalize="none"
                    placeholder="Email atau username"
                    placeholderTextColor="#9ca3af"
                />
                <TextInput
                    style={tw`bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 mb-4 text-center text-xl font-black tracking-[8px] text-gray-900 dark:text-white shadow-sm`}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Password"
                    placeholderTextColor="#9ca3af"
                />
                <TouchableOpacity style={tw`flex-row items-center mb-6 self-start pl-2`} onPress={() => setRememberMe(!rememberMe)}>
                    <Icon name={rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={tw.color(rememberMe ? 'blue-600' : 'gray-400')} />
                    <Text style={tw`ml-2 text-sm text-gray-600 dark:text-gray-300 font-bold`}>Ingat Saya</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={tw`bg-blue-600 rounded-xl py-3 items-center ${isLoading ? 'opacity-70' : ''}`}
                    onPress={handleLogin}
                    disabled={isLoading}
                >
                    <Text style={tw`text-white font-bold text-lg`}>{isLoading ? 'Loading...' : 'Masuk'}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
