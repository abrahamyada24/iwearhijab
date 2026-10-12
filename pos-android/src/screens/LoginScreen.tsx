import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import tw, { useAppColorScheme } from 'twrnc';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStore } from '../store/useStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { clearAuthSession, getAuthToken, migrateLegacyAuthStorage, setAuthToken } from '../services/secureAuthStorage';

export default function LoginScreen({ navigation }: any) {
    useAppColorScheme(tw);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAutoLogging, setIsAutoLogging] = useState(true);
    const setUser = useStore((state) => state.setUser);

    // ── Auto-login: cek session tersimpan di AsyncStorage ──────────────────
    useEffect(() => {
        const tryAutoLogin = async () => {
            try {
                await migrateLegacyAuthStorage();
                const savedToken = await getAuthToken();

                if (!savedToken) {
                    // Belum pernah login → tampilkan halaman login
                    setIsAutoLogging(false);
                    return;
                }

                // Mode SaaS wajib memvalidasi sesi ke backend. User cache tidak
                // pernah dipakai sebagai pengganti otorisasi server.
                try {
                    const res = await api.get('/auth/me');
                    if (res.data?.success && res.data?.user) {
                        // Token masih valid — pakai data terbaru dari server
                        const freshUser = res.data.user;
                        setUser(freshUser);
                        navigation.replace('Main');
                        return;
                    }
                } catch (e: any) {
                    const status = e?.response?.status;
                    if (status === 401 || status === 403) {
                        // Token sudah expired/invalid — hapus session, tampilkan login
                        console.log('Auto-login: token expired, harus login ulang');
                        await clearAuthSession();
                        setIsAutoLogging(false);
                        return;
                    }
                    await clearAuthSession();
                }
                setIsAutoLogging(false);
            } catch (e) {
                console.error('Auto-login error:', e);
                setIsAutoLogging(false);
            }
        };
        tryAutoLogin();
    }, []);

    const handleLogin = async () => {
        const identifier = email.trim().toLowerCase();
        if (!identifier || !password) {
            Alert.alert('Data Belum Lengkap', 'Email/username dan password harus diisi.');
            return;
        }

        setIsLoading(true);
        try {
            // Coba Login Online ke VPS
            const response = await api.post('/auth/login', {
                identifier,
                password,
                clientType: 'ANDROID',
                deviceName: 'LitePOS Warna Warni Android',
            });
            if (response.data.success) {
                const { token, user } = response.data;
                // Token tetap diperlukan oleh setiap request API selama aplikasi
                // dipakai. Tombol logout akan menghapusnya dari perangkat.
                await setAuthToken(token);
                setUser(user); // user.role dari backend

                navigation.replace('Main');
                return;
            }
            
        } catch (error: any) {
            // Cek jika error dari respon server (kredensial salah)
            if (error.response && error.response.status >= 400 && error.response.status < 500) {
                Alert.alert('Login Gagal', error.response?.data?.message || 'Email atau password salah');
                setIsLoading(false);
                return;
            }

            console.log('Login online gagal:', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Tampilkan loading spinner saat auto-login
    if (isAutoLogging) {
        return (
            <SafeAreaView style={tw`flex-1 justify-center items-center bg-gray-100 dark:bg-gray-800`}>
                <Image
                    source={require('../assets/icon.png')}
                    style={tw`w-28 h-28 mb-6 rounded-3xl`}
                    resizeMode="contain"
                />
                <ActivityIndicator size="large" color={tw.color('blue-600')} />
                <Text style={tw`text-gray-500 dark:text-gray-400 mt-4 font-bold text-sm`}>Memuat sesi...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={tw`flex-1 justify-center items-center bg-orange-50 dark:bg-gray-900 p-6`}>
            {/* Logo/Icon Container */}
            <View style={tw`items-center mb-8`}>
                <Image
                    source={require('../assets/icon.png')}
                    style={tw`w-28 h-28 mb-4 rounded-3xl`}
                    resizeMode="contain"
                />
                <Text style={tw`text-3xl font-black text-center text-gray-900 dark:text-white tracking-tight`}>LitePOS</Text>
                <Text style={tw`text-sm font-bold text-center text-orange-600 dark:text-orange-400 mt-1`}>Kasir Retail &amp; F&amp;B</Text>
            </View>

            <View style={tw`bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-md w-full max-w-sm border border-gray-100 dark:border-gray-800`}>
                <Text style={tw`text-lg text-center text-gray-700 dark:text-gray-200 font-bold mb-6`}>Login POS</Text>

                <TextInput
                    style={tw`bg-gray-50 dark:bg-gray-900 border focus:border-blue-500 border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 mb-4 text-center text-lg font-bold text-gray-900 dark:text-white shadow-sm`}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    placeholder="Email atau username"
                    placeholderTextColor="#9ca3af"
                />

                <TextInput
                    style={tw`bg-gray-50 dark:bg-gray-900 border focus:border-blue-500 border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 mb-4 text-center text-xl font-black tracking-[8px] text-gray-900 dark:text-white shadow-sm`}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="current-password"
                    placeholder="Password"
                    placeholderTextColor="#9ca3af"
                />

                <TouchableOpacity
                    style={tw`bg-blue-600 rounded-xl py-3 items-center ${isLoading ? 'opacity-70' : ''}`}
                    onPress={handleLogin}
                    disabled={isLoading}
                >
                    <Text style={tw`text-white font-bold text-lg`}>{isLoading ? 'Loading...' : 'Masuk'}</Text>
                </TouchableOpacity>
                <Text style={tw`text-center text-xs text-gray-400 mt-4`}>
                    Pendaftaran usaha baru tersedia melalui website LitePOS.
                </Text>
            </View>

        </SafeAreaView>
    );
}
