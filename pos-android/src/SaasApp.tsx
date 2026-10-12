import React, { useCallback, useEffect, useState } from 'react';
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
import { fetchSaasBootstrap, logoutSaas } from './services/saasDataService';
import { useStore } from './store/useStore';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function OnlineTabs() {
    return (
        <Tab.Navigator screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: tw.color('blue-600'),
            tabBarInactiveTintColor: tw.color('gray-400'),
            tabBarStyle: tw`bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 h-16 pb-2 pt-2`,
            tabBarLabelStyle: tw`font-bold text-[10px]`,
            tabBarIcon: ({ color, size }) => {
                const icons: Record<string, string> = { Beranda: 'home', Kasir: 'cash-register', Transaksi: 'receipt-text', Pengaturan: 'cog' };
                return <Icon name={icons[route.name] || 'circle'} size={size} color={color} />;
            },
        })}>
            <Tab.Screen name="Beranda" component={SaasHomeScreen} />
            <Tab.Screen name="Kasir" component={SaasPOSScreen} />
            <Tab.Screen name="Transaksi" component={SaasTransactionsScreen} />
            <Tab.Screen name="Pengaturan" component={SaasSettingsScreen} />
        </Tab.Navigator>
    );
}

function OnlineMain({ navigation }: any) {
    const setUser = useStore(state => state.setUser);
    const setSettings = useStore(state => state.setSettings);
    const setActiveShift = useStore(state => state.setActiveShift);
    const [status, setStatus] = useState<'loading' | 'ready' | 'offline' | 'license'>('loading');
    const [, , setColorScheme] = useAppColorScheme(tw);

    const bootstrap = useCallback(async () => {
        setStatus('loading');
        try {
            const data = await fetchSaasBootstrap();
            setUser(data.user);
            setSettings(data.settings);
            setActiveShift(data.activeShift ? {
                id: String(data.activeShift.id),
                openingCash: Number(data.activeShift.openingCash || 0),
                openedAt: data.activeShift.openedAt,
            } : null);
            setColorScheme(data.settings.theme);
            setStatus(data.license?.isActive ? 'ready' : 'license');
        } catch (error: any) {
            const httpStatus = error.response?.status;
            if (httpStatus === 401 || httpStatus === 403) {
                await logoutSaas();
                navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                return;
            }
            setStatus('offline');
        }
    }, [navigation, setActiveShift, setColorScheme, setSettings, setUser]);

    useEffect(() => { void bootstrap(); }, [bootstrap]);

    if (status !== 'ready') {
        return (
            <View style={tw`flex-1 bg-gray-950 items-center justify-center px-8`}>
                {status === 'loading' ? <ActivityIndicator size="large" color={tw.color('blue-400')} /> : <Icon name={status === 'license' ? 'shield-lock' : 'cloud-off-outline'} size={52} color={tw.color(status === 'license' ? 'amber-400' : 'red-400')} />}
                <Text style={tw`text-white text-xl font-black mt-5 text-center`}>{status === 'loading' ? 'Menghubungkan ke server...' : status === 'license' ? 'Lisensi usaha tidak aktif' : 'Tidak dapat terhubung ke server'}</Text>
                {status !== 'loading' && <Text style={tw`text-gray-400 text-sm text-center mt-2`}>{status === 'license' ? 'Aktifkan lisensi melalui halaman web atau hubungi pengelola LitePOS.' : 'Mode SaaS memerlukan internet dan tidak menggunakan database transaksi lokal.'}</Text>}
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
                        </Stack.Navigator>
                    </NavigationContainer>
                </SafeAreaView>
            </AppDialogProvider>
        </SafeAreaProvider>
    );
}
