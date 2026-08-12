import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator } from 'react-native';
import tw, { useAppColorScheme } from 'twrnc';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStore } from '../store/useStore';
import { getDBConnection } from '../database/db';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }: any) {
    useAppColorScheme(tw);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAutoLogging, setIsAutoLogging] = useState(true);
    const [rememberMe, setRememberMe] = useState(true);
    const setUser = useStore((state) => state.setUser);

    // ── Auto-login: cek session tersimpan di AsyncStorage ──────────────────
    useEffect(() => {
        const tryAutoLogin = async () => {
            try {
                const savedToken = await AsyncStorage.getItem('@auth_token');
                const savedUserJson = await AsyncStorage.getItem('@auth_user');

                if (!savedToken || !savedUserJson) {
                    // Belum pernah login → tampilkan halaman login
                    setIsAutoLogging(false);
                    return;
                }

                const savedUser = JSON.parse(savedUserJson);

                if (savedToken === 'offline-mode-token') {
                    // Jika token offline, langsung gunakan data dari local cache tanpa cek API
                    setUser(savedUser);
                    navigation.replace('Main');
                    return;
                }

                // Coba validasi token ke server (opsional, kalau offline skip)
                try {
                    const res = await api.get('/auth/me');
                    if (res.data?.success && res.data?.user) {
                        // Token masih valid — pakai data terbaru dari server
                        const freshUser = res.data.user;
                        setUser(freshUser);
                        await AsyncStorage.setItem('@auth_user', JSON.stringify(freshUser));
                        navigation.replace('Main');
                        return;
                    }
                } catch (e: any) {
                    const status = e?.response?.status;
                    if (status === 401 || status === 403) {
                        // Token sudah expired/invalid — hapus session, tampilkan login
                        console.log('Auto-login: token expired, harus login ulang');
                        await AsyncStorage.removeItem('@auth_token');
                        await AsyncStorage.removeItem('@auth_user');
                        setIsAutoLogging(false);
                        return;
                    }
                    // Server unreachable (network error) — fallback ke cached user
                    console.log('Auto-login: server unreachable, menggunakan data cached');
                }

                // Fallback: pakai data user yang di-cache di AsyncStorage
                setUser(savedUser);
                navigation.replace('Main');
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
                if (rememberMe) {
                    await AsyncStorage.setItem('@auth_token', token);
                    await AsyncStorage.setItem('@auth_user', JSON.stringify(user));
                } else {
                    await AsyncStorage.removeItem('@auth_token');
                    await AsyncStorage.removeItem('@auth_user');
                }
                setUser(user); // user.role dari backend
                
                // Simpan/Update data user lokal untuk login offline (menggunakan password yang barusan diketik sbg PIN)
                try {
                    const db = await getDBConnection();
                    await db.executeSql(
                        `INSERT OR REPLACE INTO users (id, name, email, pin, role) VALUES (?, ?, ?, ?, ?)`, 
                        [user.id, user.name, user.email || identifier, password, user.role]
                    );
                } catch (e) { console.error("Gagal simpan user lokal:", e) }

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

            console.log('Login online gagal, mencoba login offline...', error.message);
            
            // Fallback Offline: Jika VPS mati/tidak ada sinyal, gunakan tabel lokal `users`
            // Di tabel lokal, kita asumsikan kolom name/pin dipakai (PIN bisa berupa password jika disinkron)
            try {
                const db = await getDBConnection();
                // Cari berdasarkan email + PIN (password) untuk mencocokkan user yang tepat
                const [results] = await db.executeSql(`SELECT * FROM users WHERE email = ? AND pin = ? LIMIT 1`, [identifier, password]);

                if (results.rows.length > 0) {
                    const localUser = results.rows.item(0);
                    const offlineUser = {
                        id: localUser.id,
                        name: localUser.name,
                        role: localUser.role
                    };
                    // Simpan session untuk auto-login berikutnya
                    if (rememberMe) {
                        await AsyncStorage.setItem('@auth_user', JSON.stringify(offlineUser));
                        await AsyncStorage.setItem('@auth_token', 'offline-mode-token');
                    } else {
                        await AsyncStorage.removeItem('@auth_user');
                        await AsyncStorage.removeItem('@auth_token');
                    }
                    setUser(offlineUser);
                    Alert.alert('Offline Mode', 'Login menggunakan data lokal (tanpa internet).');
                    navigation.replace('Main');
                } else {
                    Alert.alert('Login Gagal', 'Email/Password salah, atau Anda belum pernah sinkronisasi ke HP ini.');
                }
            } catch (e) {
                Alert.alert('Error', 'Terjadi kesalahan sistem saat membaca database lokal.');
            }
            
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
                <Text style={tw`text-3xl font-black text-center text-gray-900 dark:text-white tracking-tight`}>Warna Warni</Text>
                <Text style={tw`text-sm font-bold text-center text-orange-600 dark:text-orange-400 mt-1`}>LitePOS Toko Boneka</Text>
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
                    style={tw`flex-row items-center mb-6 self-start pl-2`} 
                    onPress={() => setRememberMe(!rememberMe)}
                >
                    {rememberMe ? (
                        <Icon name="checkbox-marked" size={20} color={tw.color('blue-600')} />
                    ) : (
                        <Icon name="checkbox-blank-outline" size={20} color={tw.color('gray-400')} />
                    )}
                    <Text style={tw`ml-2 text-sm text-gray-600 dark:text-gray-300 font-bold`}>
                        Ingat Saya
                    </Text>
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
