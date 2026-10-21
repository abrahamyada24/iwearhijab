import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  StatusBar,
  View,
} from 'react-native';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppColorScheme, useDeviceContext } from 'twrnc';
import tw from './theme';
import { useStore } from './store/useStore';
import { navigationRef } from './services/navigationService';
import {
  clearAuthSession,
  AUTH_INACTIVITY_TIMEOUT_MS,
  getLastAuthActivity,
  markAuthActivity,
} from './services/secureAuthStorage';
import { getDBConnection, createTables } from './database/db';
import { bootstrapRetail } from './retail/data';
import { canOpen } from './retail/policy';
import { getShiftReminder } from './utils/shiftReminder';
import LoginScreen from './screens/LoginScreen';
import LockScreen from './screens/LockScreen';
import ReceiptPreviewScreen from './retail/ReceiptScreen';
import AppDialogProvider from './components/AppDialogProvider';
import HomeScreen from './retail/HomeScreen';
import InventoryScreen from './retail/InventoryScreen';
import POSScreen from './retail/POSScreen';
import CheckoutScreen from './retail/CheckoutScreen';
import ProductsScreen from './retail/ProductsScreen';
import MembersScreen from './retail/MembersScreen';
import StockHistoryScreen from './retail/StockHistoryScreen';
import TransactionsScreen from './retail/TransactionsScreen';
import ReportsScreen from './retail/ReportsScreen';
import ExpensesScreen from './retail/ExpensesScreen';
import SettingsScreen from './retail/SettingsScreen';
import UsersScreen from './retail/UsersScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function guarded(Component: React.ComponentType<any>) {
  return function AccessGuard(props: any) {
    const user = useStore(s => s.user);
    const status = useStore(s => s.settings.license_status);
    if (!canOpen(user, props.route.name)) return null;
    if (status !== 'ACTIVE') return <LockScreen {...props} />;
    return <Component {...props} />;
  };
}
const screens: Record<string, React.ComponentType<any>> = {
  Main: guarded(MainTabs),
  POS: guarded(POSScreen),
  Checkout: guarded(CheckoutScreen),
  ReceiptPreview: guarded(ReceiptPreviewScreen),
  ProductList: guarded(ProductsScreen),
  CategoryList: guarded(ProductsScreen),
  StockHistory: guarded(StockHistoryScreen),
  Transaksi: guarded(TransactionsScreen),
  Member: guarded(MembersScreen),
  Laporan: guarded(ReportsScreen),
  Pengeluaran: guarded(ExpensesScreen),
  UserManagement: guarded(UsersScreen),
};
function MainTabs() {
  const icons: Record<string, string> = {
    Beranda: 'home',
    Produk: 'package-variant',
    Transaksi: 'receipt-text',
    Member: 'account-group',
    Pengaturan: 'cog',
  };
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: tw.color('blue-600'),
        tabBarInactiveTintColor: '#9296a0',
        tabBarStyle: tw`bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700`,
        tabBarLabelStyle: { fontSize: 10 },
        tabBarIcon: ({ color, size }) => (
          <Icon name={icons[route.name]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Beranda" component={HomeScreen} />
      <Tab.Screen name="Produk" component={InventoryScreen} />
      <Tab.Screen name="Transaksi" component={TransactionsScreen} />
      <Tab.Screen name="Member" component={MembersScreen} />
      <Tab.Screen name="Pengaturan" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
export default function App() {
  useDeviceContext(tw, {
    initialColorScheme: 'light',
    observeDeviceColorSchemeChanges: false,
  });
  const user = useStore(s => s.user);
  const settings = useStore(s => s.settings);
  const [scheme, , setScheme] = useAppColorScheme(tw);
  const [ready, setReady] = useState(false);
  const activityWrite = useRef(0);
  const reminder = useRef('');
  useEffect(() => {
    setScheme(settings.theme);
  }, [settings.theme]);
  useEffect(() => {
    (async () => {
      const db = await getDBConnection();
      await createTables(db);
      setReady(true);
    })().catch(error =>
      Alert.alert('Aplikasi Belum Siap', String(error.message || error)),
    );
  }, []);
  const recordActivity = () => {
    if (
      useStore.getState().user &&
      Date.now() - activityWrite.current > 60000
    ) {
      activityWrite.current = Date.now();
      markAuthActivity();
    }
  };
  useEffect(() => {
    if (!user) return;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing || AppState.currentState !== 'active') return;
      refreshing = true;
      try {
        const last = await getLastAuthActivity();
        if (!last || Date.now() - last >= AUTH_INACTIVITY_TIMEOUT_MS) {
          await clearAuthSession();
          useStore.getState().clearCart();
          useStore.getState().setUser(null);
          return;
        }
        await bootstrapRetail();
        const state = useStore.getState();
        const notice = getShiftReminder(state.activeShift, state.settings);
        const key = notice ? state.activeShift?.id + ':' + notice.phase : '';
        if (notice && key !== reminder.current) {
          reminder.current = key;
          Alert.alert(notice.title, notice.message);
        }
      } catch (error: any) {
        if (
          [401, 403].includes(error.response?.status) &&
          [
            'SESSION_INVALID',
            'SESSION_EXPIRED',
            'USER_INACTIVE',
            'STORE_ACCESS_REQUIRED',
            'PASSWORD_CHANGE_REQUIRED',
          ].includes(error.response?.data?.code)
        ) {
          await clearAuthSession();
          useStore.getState().clearCart();
          useStore.getState().setUser(null);
        }
      } finally {
        refreshing = false;
      }
    };
    const interval = setInterval(refresh, 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [user?.id, user?.activeStoreId]);
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <SafeAreaProvider>
      <AppDialogProvider>
        <StatusBar
          barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={scheme === 'dark' ? '#111827' : '#ffffff'}
        />
        <SafeAreaView
          style={tw`flex-1 bg-white dark:bg-gray-900`}
          onTouchStart={recordActivity}
        >
          {!ready ? (
            <View style={tw`flex-1 justify-center`}>
              <ActivityIndicator color={tw.color('blue-600')} />
            </View>
          ) : (
            <NavigationContainer
              ref={navigationRef}
              theme={{
                ...navTheme,
                colors: { ...navTheme.colors, primary: '#a8747a' },
              }}
            >
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Login" component={LoginScreen} />
                {user && (
                  <>
                    <Stack.Screen name="Lock" component={LockScreen} />
                    {Object.entries(screens)
                      .filter(([name]) => canOpen(user, name))
                      .map(([name, component]) => (
                        <Stack.Screen
                          key={name}
                          name={name}
                          component={component}
                        />
                      ))}
                  </>
                )}
              </Stack.Navigator>
            </NavigationContainer>
          )}
        </SafeAreaView>
      </AppDialogProvider>
    </SafeAreaProvider>
  );
}
