import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw, { useAppColorScheme } from 'twrnc';
import { useStore } from '../../store/useStore';
import { fetchDashboard, logoutSaas } from '../../services/saasDataService';
import { closeCashierShift, openCashierShift } from '../../services/shiftService';
import { showApiError } from '../../services/api';

const rupiah = (value: unknown) => `Rp ${Math.round(Number(value || 0)).toLocaleString('id-ID')}`;

export default function SaasHomeScreen({ navigation }: any) {
    useAppColorScheme(tw);
    const user = useStore(state => state.user);
    const settings = useStore(state => state.settings);
    const activeShift = useStore(state => state.activeShift);
    const setActiveShift = useStore(state => state.setActiveShift);
    const setUser = useStore(state => state.setUser);
    const [dashboard, setDashboard] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [openingCash, setOpeningCash] = useState('');
    const [closingCash, setClosingCash] = useState('');

    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            setDashboard(await fetchDashboard('month'));
        } catch (error: any) {
            showApiError('Gagal Memuat Dashboard', error, 'Data dashboard belum dapat dimuat.');
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const openShift = async () => {
        try {
            const shift = await openCashierShift(user, Number(openingCash || 0));
            setActiveShift(shift);
            setOpeningCash('');
        } catch (error: any) {
            showApiError('Gagal Membuka Shift', error, 'Shift belum dapat dibuka.');
        }
    };

    const closeShift = async () => {
        if (!activeShift) return;
        try {
            await closeCashierShift(activeShift, Number(closingCash || 0));
            setActiveShift(null);
            setClosingCash('');
            Alert.alert('Shift Ditutup', 'Rekap shift sudah disimpan di server.');
            await load();
        } catch (error: any) {
            showApiError('Gagal Menutup Shift', error, 'Shift belum dapat ditutup.');
        }
    };

    const logout = async () => {
        await logoutSaas();
        setUser(null);
        setActiveShift(null);
        navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] });
    };

    const summary = dashboard?.summary || {};
    const isManager = ['OWNER', 'ADMIN'].includes(String(user?.role || '').toUpperCase());

    return (
        <ScrollView
            style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}
            contentContainerStyle={tw`p-5 pb-12`}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        >
            <View style={tw`flex-row items-center justify-between mb-6`}>
                <View style={tw`flex-1`}>
                    <Text style={tw`text-xs font-bold text-blue-600 uppercase`}>{settings.storeName}</Text>
                    <Text style={tw`text-2xl font-black text-gray-900 dark:text-white mt-1`}>Halo, {user?.name || 'Pengguna'}</Text>
                    <Text style={tw`text-xs text-gray-400 mt-1`}>Mode SaaS Online • {user?.role || '-'}</Text>
                </View>
                <TouchableOpacity onPress={logout} style={tw`p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700`}>
                    <Icon name="logout" size={21} color={tw.color('red-500')} />
                </TouchableOpacity>
            </View>

            {settings.enableShift && !activeShift && (
                <View style={tw`bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5`}>
                    <Text style={tw`font-black text-amber-900`}>Buka shift sebelum berjualan</Text>
                    <Text style={tw`text-xs text-amber-700 mt-1 mb-3`}>Masukkan kas awal di laci kasir.</Text>
                    <View style={tw`flex-row`}>
                        <TextInput
                            value={openingCash}
                            onChangeText={value => setOpeningCash(value.replace(/[^0-9]/g, ''))}
                            placeholder="Kas awal"
                            keyboardType="numeric"
                            style={tw`flex-1 bg-white border border-amber-200 rounded-xl px-4 mr-2 text-gray-900`}
                        />
                        <TouchableOpacity onPress={openShift} style={tw`bg-amber-500 px-5 py-3 rounded-xl justify-center`}>
                            <Text style={tw`text-white font-black`}>Buka</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {settings.enableShift && activeShift && (
                <View style={tw`bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5`}>
                    <Text style={tw`font-black text-emerald-900`}>Shift sedang aktif</Text>
                    <Text style={tw`text-xs text-emerald-700 mt-1 mb-3`}>Kas awal {rupiah(activeShift.openingCash)}. Masukkan kas fisik saat menutup shift.</Text>
                    <View style={tw`flex-row`}>
                        <TextInput
                            value={closingCash}
                            onChangeText={value => setClosingCash(value.replace(/[^0-9]/g, ''))}
                            placeholder="Kas akhir"
                            keyboardType="numeric"
                            style={tw`flex-1 bg-white border border-emerald-200 rounded-xl px-4 mr-2 text-gray-900`}
                        />
                        <TouchableOpacity onPress={closeShift} style={tw`bg-emerald-600 px-5 py-3 rounded-xl justify-center`}>
                            <Text style={tw`text-white font-black`}>Tutup</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={tw`flex-row mb-4`}>
                <View style={tw`flex-1 bg-blue-600 rounded-2xl p-4 mr-2`}>
                    <Text style={tw`text-blue-100 text-xs font-bold`}>Penjualan Hari Ini</Text>
                    <Text style={tw`text-white text-xl font-black mt-2`}>{rupiah(summary.todayRevenue)}</Text>
                    <Text style={tw`text-blue-100 text-xs mt-1`}>{summary.todayCount || 0} transaksi</Text>
                </View>
                <View style={tw`flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4 ml-2 border border-gray-100 dark:border-gray-700`}>
                    <Text style={tw`text-gray-400 text-xs font-bold`}>Stok Menipis</Text>
                    <Text style={tw`text-gray-900 dark:text-white text-2xl font-black mt-2`}>{summary.lowStockCount || 0}</Text>
                    <Text style={tw`text-gray-400 text-xs mt-1`}>produk</Text>
                </View>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('POS')} style={tw`bg-gray-900 rounded-2xl p-5 flex-row items-center mb-3`}>
                <View style={tw`w-12 h-12 bg-blue-500 rounded-xl items-center justify-center mr-4`}>
                    <Icon name="cash-register" size={26} color="white" />
                </View>
                <View style={tw`flex-1`}>
                    <Text style={tw`text-white text-lg font-black`}>Buka Kasir</Text>
                    <Text style={tw`text-gray-400 text-xs mt-1`}>Produk dan stok langsung dari server</Text>
                </View>
                <Icon name="chevron-right" size={25} color="white" />
            </TouchableOpacity>

            {isManager && (
                <>
                <View style={tw`flex-row`}>
                    <TouchableOpacity onPress={() => navigation.navigate('Management')} style={tw`flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4 mr-2 border border-gray-100 dark:border-gray-700`}>
                        <Icon name="package-variant" size={24} color={tw.color('blue-600')} />
                        <Text style={tw`font-black text-gray-900 dark:text-white mt-3`}>Produk</Text>
                        <Text style={tw`text-xs text-gray-400 mt-1`}>Kelola master data</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Team')} style={tw`flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4 ml-2 border border-gray-100 dark:border-gray-700`}>
                        <Icon name="account-group" size={24} color={tw.color('purple-600')} />
                        <Text style={tw`font-black text-gray-900 dark:text-white mt-3`}>Pegawai</Text>
                        <Text style={tw`text-xs text-gray-400 mt-1`}>Admin dan kasir</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Inventory')} style={tw`bg-white dark:bg-gray-800 rounded-2xl p-4 mt-3 border border-gray-100 dark:border-gray-700 flex-row items-center`}>
                    <View style={tw`w-11 h-11 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl items-center justify-center mr-3`}>
                        <Icon name="warehouse" size={24} color={tw.color('emerald-600')} />
                    </View>
                    <View style={tw`flex-1`}><Text style={tw`font-black text-gray-900 dark:text-white`}>Persediaan</Text><Text style={tw`text-xs text-gray-400 mt-1`}>Stok masuk dan penyesuaian</Text></View>
                    <Icon name="chevron-right" size={23} color={tw.color('gray-400')} />
                </TouchableOpacity>
                </>
            )}

            {refreshing && !dashboard && <ActivityIndicator style={tw`mt-8`} color={tw.color('blue-600')} />}
        </ScrollView>
    );
}
