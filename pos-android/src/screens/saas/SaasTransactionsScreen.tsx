import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw, { useAppColorScheme } from 'twrnc';
import { fetchDashboard, fetchTransactions } from '../../services/saasDataService';
import api, { showApiError } from '../../services/api';
import { useStore } from '../../store/useStore';

const rupiah = (value: unknown) => `Rp ${Math.round(Number(value || 0)).toLocaleString('id-ID')}`;

export default function SaasTransactionsScreen() {
    useAppColorScheme(tw);
    const user = useStore(state => state.user);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [dashboard, setDashboard] = useState<any>({});
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const activeStore = user?.stores?.find((store: any) => Number(store.id) === Number(user.activeStoreId));
    const isLaundry = String(activeStore?.type || '').toUpperCase() === 'LAUNDRY';

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [response, dashboardData] = await Promise.all([fetchTransactions(1, 100), fetchDashboard(period)]);
            setTransactions(response.data || []);
            setDashboard(dashboardData || {});
        } catch (error: any) {
            showApiError('Gagal Memuat Transaksi', error, 'Riwayat transaksi belum dapat dimuat.');
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => { void load(); }, [load]);

    const updateWorkStatus = async (transactionId: number, workStatus: string) => {
        setUpdatingId(transactionId);
        try {
            const response = await api.patch(`/transactions/${transactionId}/work-status`, { workStatus });
            const updated = response.data?.data;
            setTransactions(current => current.map(item => item.id === transactionId ? { ...item, ...updated } : item));
        } catch (error: any) {
            showApiError('Gagal Mengubah Status', error, 'Status pengerjaan belum dapat diperbarui.');
        } finally {
            setUpdatingId(null);
        }
    };

    const workStatuses = [
        { value: 'RECEIVED', label: 'Diterima' },
        { value: 'PROCESSING', label: 'Diproses' },
        { value: 'READY', label: 'Siap' },
        { value: 'PICKED_UP', label: 'Diambil' },
    ];

    return (
        <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
            <View style={tw`bg-white dark:bg-gray-900 px-5 py-5 border-b border-gray-200 dark:border-gray-800`}>
                <Text style={tw`text-2xl font-black text-gray-900 dark:text-white`}>Laporan</Text>
                <Text style={tw`text-xs text-gray-400 mt-1`}>Ringkasan dan histori transaksi usaha</Text>
                <View style={tw`flex-row bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mt-4`}>
                    {([['week', '7 Hari'], ['month', 'Bulan Ini'], ['year', 'Tahun Ini']] as const).map(([key, label]) => <TouchableOpacity key={key} onPress={() => setPeriod(key)} style={period === key ? tw`flex-1 bg-white dark:bg-gray-700 rounded-lg py-2 items-center` : tw`flex-1 py-2 items-center`}><Text style={period === key ? tw`text-blue-600 dark:text-blue-300 font-black text-xs` : tw`text-gray-400 font-bold text-xs`}>{label}</Text></TouchableOpacity>)}
                </View>
            </View>
            {loading && transactions.length === 0 ? (
                <View style={tw`flex-1 items-center justify-center`}><ActivityIndicator size="large" color={tw.color('blue-600')} /></View>
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={item => String(item.id)}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
                    contentContainerStyle={tw`p-4 pb-10`}
                    ListHeaderComponent={(
                        <View>
                            <View style={tw`bg-blue-600 rounded-2xl p-5 mb-3`}><Text style={tw`text-blue-100 text-xs font-bold`}>Total Pendapatan</Text><Text style={tw`text-white text-3xl font-black mt-2`}>{rupiah(dashboard?.summary?.totalRevenue)}</Text><Text style={tw`text-blue-100 text-xs mt-1`}>{dashboard?.summary?.totalTransactions || 0} transaksi</Text></View>
                            <View style={tw`flex-row mb-5`}><View style={tw`flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 mr-2 border border-gray-100 dark:border-gray-700`}><Text style={tw`text-xs text-gray-400`}>Laba Kotor</Text><Text style={tw`font-black text-emerald-600 mt-2`}>{rupiah(dashboard?.summary?.totalProfit)}</Text></View><View style={tw`flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 ml-2 border border-gray-100 dark:border-gray-700`}><Text style={tw`text-xs text-gray-400`}>Pengeluaran</Text><Text style={tw`font-black text-red-500 mt-2`}>{rupiah(dashboard?.summary?.totalExpenses)}</Text></View></View>
                            <Text style={tw`font-black text-gray-900 dark:text-white mb-3`}>Histori Transaksi</Text>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={tw`text-center text-gray-400 mt-16`}>Belum ada transaksi.</Text>}
                    renderItem={({ item }) => (
                        <View style={tw`bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 mb-3`}>
                            <View style={tw`flex-row items-center`}>
                                <View style={tw`w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl items-center justify-center mr-3`}><Icon name="receipt-text" size={20} color={tw.color('blue-600')} /></View>
                                <View style={tw`flex-1`}>
                                    <Text style={tw`font-black text-gray-900 dark:text-white`}>{item.invoiceNumber}</Text>
                                    <Text style={tw`text-xs text-gray-400 mt-1`}>{new Date(item.createdAt).toLocaleString('id-ID')}</Text>
                                </View>
                                <Text style={tw`font-black text-blue-600`}>{rupiah(item.grandTotal)}</Text>
                            </View>
                            <View style={tw`flex-row mt-3 pt-3 border-t border-gray-100 dark:border-gray-700`}>
                                <Text style={tw`flex-1 text-xs text-gray-500`}>{item.customer?.name || item.customerName || 'Umum'}</Text>
                                <Text style={item.status === 'PAID' || item.status === 'COMPLETED' ? tw`text-xs font-black text-green-600` : tw`text-xs font-black text-amber-600`}>{item.status}</Text>
                            </View>
                            {isLaundry && item.workStatus && (
                                <View style={tw`mt-3 pt-3 border-t border-gray-100 dark:border-gray-700`}>
                                    <Text style={tw`text-xs font-black text-gray-600 dark:text-gray-300 mb-2`}>Status pengerjaan</Text>
                                    <View style={tw`flex-row flex-wrap`}>
                                        {workStatuses.map(status => {
                                            const active = item.workStatus === status.value;
                                            return (
                                                <TouchableOpacity
                                                    key={status.value}
                                                    disabled={updatingId === item.id || active}
                                                    onPress={() => updateWorkStatus(item.id, status.value)}
                                                    style={active ? tw`bg-blue-600 rounded-full px-3 py-2 mr-2 mb-2` : tw`bg-gray-100 dark:bg-gray-700 rounded-full px-3 py-2 mr-2 mb-2`}
                                                >
                                                    <Text style={active ? tw`text-white text-xs font-black` : tw`text-gray-600 dark:text-gray-200 text-xs font-bold`}>{status.label}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                    {updatingId === item.id && <ActivityIndicator size="small" color={tw.color('blue-600')} />}
                                </View>
                            )}
                        </View>
                    )}
                />
            )}
        </View>
    );
}
