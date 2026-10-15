import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw, { useAppColorScheme } from 'twrnc';
import { useStore } from '../../store/useStore';
import { fetchDashboard, fetchProducts, logoutSaas } from '../../services/saasDataService';
import { closeCashierShift, openCashierShift } from '../../services/shiftService';
import { showApiError } from '../../services/api';

const rupiah = (value: unknown) => `Rp ${Math.round(Number(value || 0)).toLocaleString('id-ID')}`;

function MenuItem({ icon, title, subtitle, color, background, onPress, primary = false }: any) {
    return (
        <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={primary ? tw`bg-blue-600 rounded-2xl p-5 flex-row items-center mb-3` : tw`bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex-row items-center mb-3`}>
            <View style={[tw`w-12 h-12 rounded-xl items-center justify-center mr-4`, { backgroundColor: primary ? 'rgba(255,255,255,0.18)' : background }]}><Icon name={icon} size={25} color={primary ? 'white' : color} /></View>
            <View style={tw`flex-1`}><Text style={primary ? tw`text-white text-base font-black` : tw`text-gray-900 dark:text-white text-base font-black`}>{title}</Text><Text style={primary ? tw`text-blue-100 text-xs mt-1` : tw`text-gray-400 text-xs mt-1`}>{subtitle}</Text></View>
            <Icon name="chevron-right" size={23} color={primary ? 'white' : '#94A3B8'} />
        </TouchableOpacity>
    );
}

export default function SaasHomeScreen({ navigation }: any) {
    useAppColorScheme(tw);
    const user = useStore(state => state.user);
    const settings = useStore(state => state.settings);
    const activeShift = useStore(state => state.activeShift);
    const setActiveShift = useStore(state => state.setActiveShift);
    const setUser = useStore(state => state.setUser);
    const [dashboard, setDashboard] = useState<any>(null);
    const [productCount, setProductCount] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [openingCash, setOpeningCash] = useState('');
    const [closingCash, setClosingCash] = useState('');

    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            const [dashboardData, products] = await Promise.all([fetchDashboard('month'), fetchProducts()]);
            setDashboard(dashboardData);
            setProductCount(products.filter((item: any) => item.isActive !== false).length);
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
            setActiveShift(shift); setOpeningCash('');
        } catch (error: any) { showApiError('Gagal Membuka Shift', error, 'Shift belum dapat dibuka.'); }
    };
    const closeShift = async () => {
        if (!activeShift) return;
        try {
            await closeCashierShift(activeShift, Number(closingCash || 0));
            setActiveShift(null); setClosingCash('');
            Alert.alert('Shift Ditutup', 'Rekap shift sudah disimpan di server.');
            await load();
        } catch (error: any) { showApiError('Gagal Menutup Shift', error, 'Shift belum dapat ditutup.'); }
    };
    const logout = async () => {
        await logoutSaas(); setUser(null); setActiveShift(null);
        navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] });
    };

    const summary = dashboard?.summary || {};
    const role = String(user?.role || 'CASHIER').toUpperCase();
    const isManager = role === 'OWNER' || role === 'ADMIN';
    const activeStore = user?.stores?.find((store: any) => Number(store.id) === Number(user.activeStoreId));
    const businessType = String(activeStore?.type || 'RETAIL').toUpperCase();

    return (
        <ScrollView style={tw`flex-1 bg-gray-50 dark:bg-gray-950`} contentContainerStyle={tw`px-5 pt-4 pb-12`} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
            <View style={tw`flex-row items-center mb-5`}>
                <View style={tw`w-11 h-11 bg-blue-600 rounded-xl items-center justify-center mr-3`}><Icon name="storefront-outline" size={23} color="white" /></View>
                <View style={tw`flex-1`}><Text style={tw`text-[10px] font-black text-blue-600 uppercase`}>{settings.storeName}</Text><Text style={tw`text-xl font-black text-gray-900 dark:text-white`}>Halo, {user?.name || 'Pengguna'}</Text><Text style={tw`text-xs text-gray-400`}>{businessType === 'FNB' ? 'Food & Beverage' : businessType === 'LAUNDRY' ? 'Laundry' : 'Retail'} • {role}</Text></View>
                <TouchableOpacity onPress={logout} style={tw`w-11 h-11 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 items-center justify-center`}><Icon name="logout" size={20} color="#EF4444" /></TouchableOpacity>
            </View>

            {settings.enableShift && !activeShift && <View style={tw`bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4`}><Text style={tw`font-black text-amber-900`}>Buka shift untuk mulai berjualan</Text><Text style={tw`text-xs text-amber-700 mt-1 mb-3`}>Masukkan uang tunai yang tersedia di laci kasir.</Text><View style={tw`flex-row`}><TextInput value={openingCash ? Number(openingCash).toLocaleString('id-ID') : ''} onChangeText={value => setOpeningCash(value.replace(/[^0-9]/g, ''))} placeholder="0" keyboardType="numeric" style={tw`flex-1 bg-white border border-amber-200 rounded-xl px-4 mr-2 text-gray-900`} placeholderTextColor="#94A3B8" /><TouchableOpacity onPress={openShift} style={tw`bg-amber-500 px-5 rounded-xl justify-center`}><Text style={tw`text-white font-black`}>Mulai</Text></TouchableOpacity></View></View>}
            {settings.enableShift && activeShift && <View style={tw`bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4`}><View style={tw`flex-row items-center mb-2`}><View style={tw`w-2 h-2 bg-emerald-500 rounded-full mr-2`} /><Text style={tw`font-black text-emerald-900`}>Shift aktif</Text></View><Text style={tw`text-xs text-emerald-700 mb-3`}>{user?.name} • kas awal {rupiah(activeShift.openingCash)}</Text><View style={tw`flex-row`}><TextInput value={closingCash ? Number(closingCash).toLocaleString('id-ID') : ''} onChangeText={value => setClosingCash(value.replace(/[^0-9]/g, ''))} placeholder="Kas fisik saat ini" keyboardType="numeric" style={tw`flex-1 bg-white border border-emerald-200 rounded-xl px-4 mr-2 text-gray-900`} placeholderTextColor="#94A3B8" /><TouchableOpacity onPress={closeShift} style={tw`bg-emerald-600 px-4 rounded-xl justify-center`}><Text style={tw`text-white font-black`}>Tutup</Text></TouchableOpacity></View></View>}

            <View style={tw`bg-gray-900 rounded-3xl p-5 mb-3 overflow-hidden`}>
                <View style={tw`flex-row items-start`}><View style={tw`flex-1`}><Text style={tw`text-gray-400 text-xs font-bold`}>Pendapatan Hari Ini</Text><Text style={tw`text-white text-3xl font-black mt-2`}>{rupiah(summary.todayRevenue)}</Text></View><TouchableOpacity onPress={() => navigation.navigate('Laporan')} style={tw`bg-white/10 rounded-xl px-3 py-2 flex-row items-center`}><Icon name="arrow-top-right" size={15} color="white" /><Text style={tw`text-white text-xs font-bold ml-1`}>Laporan</Text></TouchableOpacity></View>
                <View style={tw`border-t border-gray-700 mt-4 pt-3 flex-row items-center`}><Icon name="trending-up" size={15} color="#34D399" /><Text style={tw`text-emerald-400 text-xs font-bold ml-2`}>{summary.todayCount || 0} transaksi hari ini</Text><Text style={tw`text-gray-500 text-xs ml-auto`}>Tarik untuk refresh</Text></View>
            </View>

            <View style={tw`flex-row mb-5`}>
                <TouchableOpacity onPress={() => navigation.navigate('Laporan')} style={tw`flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4 mr-2 border border-gray-100 dark:border-gray-700`}><View style={tw`w-9 h-9 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl items-center justify-center`}><Icon name="cart-variant" size={19} color="#059669" /></View><Text style={tw`text-2xl font-black text-gray-900 dark:text-white mt-3`}>{summary.todayCount || 0}</Text><Text style={tw`text-xs text-gray-400 mt-1`}>Transaksi</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => isManager && navigation.navigate('Inventori')} style={tw`flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4 mx-1 border border-gray-100 dark:border-gray-700`}><View style={tw`w-9 h-9 bg-blue-50 dark:bg-blue-900/30 rounded-xl items-center justify-center`}><Icon name="package-variant" size={19} color="#2563EB" /></View><Text style={tw`text-2xl font-black text-gray-900 dark:text-white mt-3`}>{productCount}</Text><Text style={tw`text-xs text-gray-400 mt-1`}>Produk</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Inventory')} style={tw`flex-1 bg-white dark:bg-gray-800 rounded-2xl p-4 ml-2 border border-gray-100 dark:border-gray-700`}><View style={tw`w-9 h-9 bg-amber-50 dark:bg-amber-900/30 rounded-xl items-center justify-center`}><Icon name="alert-circle-outline" size={19} color="#D97706" /></View><Text style={tw`text-2xl font-black text-gray-900 dark:text-white mt-3`}>{summary.lowStockCount || 0}</Text><Text style={tw`text-xs text-gray-400 mt-1`}>Stok tipis</Text></TouchableOpacity>
            </View>

            <Text style={tw`text-base font-black text-gray-900 dark:text-white mb-3`}>Menu Utama</Text>
            <MenuItem primary icon="point-of-sale" title="Buka Kasir (POS)" subtitle="Mulai transaksi penjualan" onPress={() => navigation.getParent()?.navigate('POS')} />
            {isManager ? <>
                <MenuItem icon="chart-box-outline" title="Laporan & Pengeluaran" subtitle="Histori transaksi dan biaya usaha" color="#2563EB" background="#EFF6FF" onPress={() => navigation.navigate('Laporan')} />
                <MenuItem icon="database-outline" title="Kelola Data" subtitle="Produk, kategori, stok dan pegawai" color="#7C3AED" background="#F5F3FF" onPress={() => navigation.navigate('Inventori')} />
                <MenuItem icon="account-multiple-outline" title="Kontak & Pelanggan" subtitle="Data pelanggan dan supplier" color="#059669" background="#ECFDF5" onPress={() => navigation.navigate('Kontak')} />
                <MenuItem icon="account-cog-outline" title="Pegawai" subtitle="Kelola admin dan kasir usaha" color="#DB2777" background="#FDF2F8" onPress={() => navigation.getParent()?.navigate('Team')} />
            </> : <MenuItem icon="wallet-outline" title="Pengeluaran" subtitle="Catat biaya operasional usaha" color="#DC2626" background="#FEF2F2" onPress={() => navigation.navigate('Pengeluaran')} />}
            {refreshing && !dashboard && <ActivityIndicator style={tw`mt-8`} color="#2563EB" />}
        </ScrollView>
    );
}
