import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw, { useAppColorScheme } from 'twrnc';
import AppDialogProvider from './components/AppDialogProvider';
import LoginScreen from './screens/LoginScreen';
import ReceiptPreviewScreen from './screens/ReceiptPreviewScreen';
import SaasHomeScreen from './screens/saas/SaasHomeScreen';
import SaasPOSScreen from './screens/saas/SaasPOSScreen';
import SaasCheckoutScreen from './screens/saas/SaasCheckoutScreen';
import SaasTransactionsScreen from './screens/saas/SaasTransactionsScreen';
import SaasManagementScreen from './screens/saas/SaasManagementScreen';
import SaasTeamScreen from './screens/saas/SaasTeamScreen';
import SaasSettingsScreen from './screens/saas/SaasSettingsScreen';
import SaasInventoryScreen from './screens/saas/SaasInventoryScreen';
import SaasInventoryHubScreen from './screens/saas/SaasInventoryHubScreen';
import SaasContactScreen from './screens/saas/SaasContactScreen';
import SaasExpenseScreen from './screens/saas/SaasExpenseScreen';
import { createCachedSaasBootstrap, fetchSaasBootstrap, logoutSaas } from './services/saasDataService';
import { useStore } from './store/useStore';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
// Axios membatasi request pada 20 detik. Deadline ini sedikit lebih panjang
// supaya cold start Vercel tidak diputus prematur oleh lapisan UI.
const BOOTSTRAP_DEADLINE_MS = 30000;

const withDeadline = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('BOOTSTRAP_TIMEOUT')), timeoutMs);
    promise.then(
        value => {
            clearTimeout(timer);
            resolve(value);
        },
        error => {
            clearTimeout(timer);
            reject(error);
        },
    );
});

function OnlineTabs() {
    const user = useStore(state => state.user);
    const role = String(user?.role || 'CASHIER').toUpperCase();
    const isManager = role === 'OWNER' || role === 'ADMIN';
    return (
        <Tab.Navigator screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: tw.color('blue-600'),
            tabBarInactiveTintColor: tw.color('gray-400'),
            tabBarStyle: tw`bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 h-16 pb-2 pt-2`,
            tabBarLabelStyle: tw`font-bold text-[10px]`,
            tabBarIcon: ({ color, size }) => {
                const icons: Record<string, string> = {
                    Beranda: 'home', Inventori: 'package-variant', Laporan: 'file-document-outline',
                    Kontak: 'account-box-outline', Pengeluaran: 'wallet-outline', Pengaturan: 'cog-outline',
                };
                return <Icon name={icons[route.name] || 'circle'} size={size} color={color} />;
            },
        })}>
            <Tab.Screen name="Beranda" component={SaasHomeScreen} />
            {isManager && <Tab.Screen name="Inventori" component={SaasInventoryHubScreen} />}
            <Tab.Screen name="Laporan" component={SaasTransactionsScreen} />
            {!isManager && <Tab.Screen name="Pengeluaran" component={SaasExpenseScreen} />}
            <Tab.Screen name="Kontak" component={SaasContactScreen} />
            <Tab.Screen name="Pengaturan" component={SaasSettingsScreen} />
        </Tab.Navigator>
    );
}

function OnlineMain({ navigation }: any) {
    const setUser = useStore(state => state.setUser);
    const setSettings = useStore(state => state.setSettings);
    const setActiveShift = useStore(state => state.setActiveShift);
    const [status, setStatus] = useState<'loading' | 'ready' | 'offline' | 'license'>('loading');
    const [isTakingLong, setIsTakingLong] = useState(false);
    const [errorDetail, setErrorDetail] = useState('');
    const [, , setColorScheme] = useAppColorScheme(tw);
    const bootstrapStartedRef = useRef(false);

    const applyBootstrap = useCallback((data: any) => {
        setUser(data.user);
        setSettings(data.settings);
        setActiveShift(data.activeShift ? {
            id: String(data.activeShift.id),
            openingCash: Number(data.activeShift.openingCash || 0),
            openedAt: data.activeShift.openedAt,
        } : null);
        setColorScheme(data.settings.theme);
    }, [setActiveShift, setColorScheme, setSettings, setUser]);

    const bootstrap = useCallback(async () => {
        setStatus('loading');
        setIsTakingLong(false);
        setErrorDetail('');
        const slowTimer = setTimeout(() => setIsTakingLong(true), 4000);
        try {
            const authenticatedUser = useStore.getState().user;
            if (authenticatedUser) {
                // Login sudah membuktikan identitas dan tenant pengguna. Buka UI
                // segera dengan konfigurasi aman, kemudian perbarui data server
                // tanpa menahan pengguna di splash screen.
                const cachedData = await createCachedSaasBootstrap(authenticatedUser);
                applyBootstrap(cachedData);
                setStatus('ready');
                clearTimeout(slowTimer);

                void withDeadline(fetchSaasBootstrap(), BOOTSTRAP_DEADLINE_MS).then((freshData) => {
                    applyBootstrap(freshData);
                    if (!freshData.license?.isActive) setStatus('license');
                }).catch(async (error: any) => {
                    const httpStatus = error.response?.status;
                    if (httpStatus === 401 || httpStatus === 403) {
                        await logoutSaas();
                        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                    }
                    // Error konfigurasi non-auth tidak menutup dashboard. Setiap
                    // operasi bisnis tetap akan diverifikasi oleh backend.
                });
                return;
            }

            const data = await withDeadline(fetchSaasBootstrap(), BOOTSTRAP_DEADLINE_MS);
            applyBootstrap(data);
            setStatus(data.license?.isActive ? 'ready' : 'license');
        } catch (error: any) {
            const httpStatus = error.response?.status;
            if (httpStatus === 401 || httpStatus === 403) {
                await logoutSaas();
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                return;
            }
            const responseCode = error.response?.data?.code;
            const errorCode = responseCode || (httpStatus ? `HTTP ${httpStatus}` : error.code || error.message);
            setErrorDetail(errorCode ? `Kode: ${String(errorCode).slice(0, 80)}` : 'Server tidak memberikan respons.');
            setStatus('offline');
        } finally {
            clearTimeout(slowTimer);
        }
    }, [applyBootstrap, navigation]);

    useEffect(() => {
        // useAppColorScheme dapat menghasilkan setter baru setelah tema diubah.
        // Tanpa penjaga ini, dependency bootstrap ikut berubah dan efek memulai
        // ulang loading pada setiap render sehingga dashboard tidak pernah muncul.
        if (bootstrapStartedRef.current) return;
        bootstrapStartedRef.current = true;
        void bootstrap();
    }, [bootstrap]);

    if (status !== 'ready') {
        return (
            <View style={tw`flex-1 bg-gray-950 items-center justify-center px-8`}>
                {status === 'loading' ? <ActivityIndicator size="large" color={tw.color('blue-400')} /> : <Icon name={status === 'license' ? 'shield-lock' : 'cloud-off-outline'} size={52} color={tw.color(status === 'license' ? 'amber-400' : 'red-400')} />}
                <Text style={tw`text-white text-xl font-black mt-5 text-center`}>{status === 'loading' ? 'Menyiapkan data usaha...' : status === 'license' ? 'Lisensi usaha tidak aktif' : 'Tidak dapat terhubung ke server'}</Text>
                {status === 'loading' && isTakingLong && <Text style={tw`text-gray-400 text-sm text-center mt-2`}>Server demo sedang diaktifkan. Aplikasi akan mencoba jalur cadangan secara otomatis.</Text>}
                {status !== 'loading' && <Text style={tw`text-gray-400 text-sm text-center mt-2`}>{status === 'license' ? 'Aktifkan lisensi melalui halaman web atau hubungi pengelola LitePOS.' : 'Mode SaaS memerlukan internet dan tidak menggunakan database transaksi lokal.'}</Text>}
                {status === 'offline' && Boolean(errorDetail) && <Text style={tw`text-red-300 text-xs text-center mt-3`}>{errorDetail}</Text>}
                <Text style={tw`text-gray-600 text-[10px] text-center mt-2`}>LitePOS Demo v1.4.0</Text>
                {status !== 'loading' && <TouchableOpacity onPress={bootstrap} style={tw`bg-blue-600 rounded-xl px-6 py-3 mt-6`}><Text style={tw`text-white font-black`}>Coba Lagi</Text></TouchableOpacity>}
            </View>
        );
    }
    return <OnlineTabs />;
}

export default function SaasApp() {
    const settings = useStore(state => state.settings);
    const dark = settings.theme === 'dark';
    return (
        <SafeAreaProvider>
            <AppDialogProvider>
                <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={dark ? tw.color('gray-900') : tw.color('white')} />
                <SafeAreaView style={tw`flex-1 bg-white dark:bg-gray-900`}>
                    <NavigationContainer theme={dark ? DarkTheme : DefaultTheme}>
                        <Stack.Navigator screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="Login" component={LoginScreen} />
                            <Stack.Screen name="Main" component={OnlineMain} />
                            <Stack.Screen name="POS" component={SaasPOSScreen} />
                            <Stack.Screen name="Checkout" component={SaasCheckoutScreen} />
                            <Stack.Screen name="ReceiptPreview" component={ReceiptPreviewScreen} />
                            <Stack.Screen name="Management" component={SaasManagementScreen} />
                            <Stack.Screen name="Inventory" component={SaasInventoryScreen} />
                            <Stack.Screen name="Team" component={SaasTeamScreen} />
                            <Stack.Screen name="Expenses" component={SaasExpenseScreen} />
                        </Stack.Navigator>
                    </NavigationContainer>
                </SafeAreaView>
            </AppDialogProvider>
        </SafeAreaProvider>
    );
}
