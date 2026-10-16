import React, { useEffect, useRef } from 'react';
import { Alert, NativeModules, PermissionsAndroid, Platform, Vibration } from 'react-native';
import {
    getInitialNotification,
    getMessaging,
    getToken,
    onMessage,
    onNotificationOpenedApp,
    onTokenRefresh,
    type RemoteMessage,
} from '@react-native-firebase/messaging';
import api from '../services/api';
import { openKitchenQueue } from '../services/navigationService';
import { useStore } from '../store/useStore';

const KITCHEN_NOTIFICATION_TYPE = 'KITCHEN_ORDER_NEW';

const isKitchenNotification = (message: RemoteMessage | null) => (
    message?.data?.type === KITCHEN_NOTIFICATION_TYPE
);

const requestAndroidNotificationPermission = async () => {
    if (Platform.OS !== 'android' || Number(Platform.Version) < 33) return true;
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    return result === PermissionsAndroid.RESULTS.GRANTED;
};

export default function OrderNotificationWatcher() {
    const user = useStore(state => state.user);
    const enableTableOrder = useStore(state => state.settings.enableTableOrder);
    const enableKitchenQueue = useStore(state => state.settings.enableKitchenQueue);
    const setTableOrderNotificationCount = useStore(state => state.setTableOrderNotificationCount);
    const foregroundMessageIdsRef = useRef(new Set<string>());

    useEffect(() => {
        if (!user || !enableTableOrder) {
            setTableOrderNotificationCount(0);
            return undefined;
        }

        const refresh = async () => {
            try {
                const response = await api.get('/saved-transactions');
                const rows = Array.isArray(response.data?.data) ? response.data.data : [];
                const count = rows.filter((row: any) => {
                    try {
                        const payload = typeof row.cartData === 'string' ? JSON.parse(row.cartData) : row.cartData;
                        return payload?.source === 'TABLE_QR' || Boolean(payload?.tableNumber);
                    } catch {
                        return false;
                    }
                }).length;

                setTableOrderNotificationCount(count);
            } catch {
                // Pertahankan badge terakhir saat koneksi sementara terputus.
            }
        };

        refresh();
        const intervalId = setInterval(refresh, 5000);
        return () => clearInterval(intervalId);
    }, [enableTableOrder, setTableOrderNotificationCount, user]);

    useEffect(() => {
        if (!user || !enableKitchenQueue) return undefined;

        const messaging = getMessaging();
        let active = true;

        const registerToken = async (token: string) => {
            if (!token || !active) return;
            await api.post('/push-devices/register', {
                token,
                platform: 'ANDROID',
                scope: 'KITCHEN',
                deviceName: 'KasirPOS Android',
            });
        };

        const initializePush = async () => {
            try {
                const allowed = await requestAndroidNotificationPermission();
                if (!allowed || !active) return;
                await registerToken(await getToken(messaging));
            } catch (error: any) {
                console.warn('Registrasi notifikasi kitchen belum berhasil:', error?.message || error);
            }
        };

        const unsubscribeToken = onTokenRefresh(messaging, token => {
            registerToken(token).catch(error => {
                console.warn('Pembaruan token notifikasi gagal:', error?.message || error);
            });
        });

        const unsubscribeForeground = onMessage(messaging, async message => {
            if (!isKitchenNotification(message)) return;
            if (message.messageId && foregroundMessageIdsRef.current.has(message.messageId)) return;
            if (message.messageId) foregroundMessageIdsRef.current.add(message.messageId);

            try {
                NativeModules.OrderNotificationSound?.play?.();
                Vibration.vibrate([0, 180, 100, 180]);
            } catch {
                // Pesanan tetap tersimpan walaupun suara atau vibrasi gagal.
            }

            Alert.alert(
                message.notification?.title || 'Pesanan dapur baru',
                message.notification?.body || 'Pesanan baru masuk ke antrean dapur.',
                [
                    { text: 'Nanti', style: 'cancel' },
                    { text: 'Buka Antrean', onPress: () => openKitchenQueue() },
                ],
            );
        });

        const unsubscribeOpened = onNotificationOpenedApp(messaging, message => {
            if (isKitchenNotification(message)) openKitchenQueue();
        });

        getInitialNotification(messaging)
            .then(message => {
                if (isKitchenNotification(message)) openKitchenQueue();
            })
            .catch(() => undefined);

        initializePush();
        return () => {
            active = false;
            unsubscribeToken();
            unsubscribeForeground();
            unsubscribeOpened();
        };
    }, [enableKitchenQueue, user]);

    return null;
}
