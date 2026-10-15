import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw, { useAppColorScheme } from 'twrnc';
import api, { showApiError } from '../../services/api';
import { useStore } from '../../store/useStore';

const EXPENSE_CATEGORIES = ['Umum', 'Listrik', 'Air', 'Internet', 'Transportasi', 'Gaji', 'Sewa', 'Perawatan', 'Lainnya'];
const PURCHASE_CATEGORIES = ['Bahan Baku', 'Stok Barang', 'Kemasan', 'Peralatan', 'Lainnya'];
const rupiah = (value: unknown) => `Rp ${Math.round(Number(value || 0)).toLocaleString('id-ID')}`;

export default function SaasExpenseScreen() {
    useAppColorScheme(tw);
    const user = useStore(state => state.user);
    const [items, setItems] = useState<any[]>([]);
    const [activeType, setActiveType] = useState<'EXPENSE' | 'PURCHASE'>('EXPENSE');
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Umum');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/expenses');
            const all = response.data?.data || [];
            setItems(all.filter((item: any) => String(item.type || 'EXPENSE').toUpperCase() === activeType));
        } catch (error: any) {
            showApiError('Gagal Memuat Pengeluaran', error, 'Data pengeluaran belum dapat dimuat.');
        } finally {
            setLoading(false);
        }
    }, [activeType]);

    useEffect(() => { void load(); }, [load]);
    const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.amount || 0), 0), [items]);
    const categories = activeType === 'PURCHASE' ? PURCHASE_CATEGORIES : EXPENSE_CATEGORIES;

    const openForm = () => {
        setDescription(''); setAmount('');
        setCategory(activeType === 'PURCHASE' ? 'Bahan Baku' : 'Umum');
        setModalOpen(true);
    };

    const save = async () => {
        const parsedAmount = Number(amount.replace(/[^0-9]/g, '') || 0);
        if (!description.trim() || parsedAmount <= 0) return Alert.alert('Data Belum Lengkap', 'Isi keterangan dan nominal lebih dari Rp0.');
        setSaving(true);
        try {
            await api.post('/expenses', { description: description.trim(), amount: parsedAmount, category, type: activeType });
            setModalOpen(false);
            await load();
        } catch (error: any) {
            showApiError('Gagal Menyimpan', error, 'Pengeluaran belum dapat disimpan.');
        } finally {
            setSaving(false);
        }
    };

    const remove = (item: any) => Alert.alert('Hapus Catatan', `Hapus ${item.description}?`, [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: async () => { try { await api.delete(`/expenses/${item.id}`); await load(); } catch (error: any) { showApiError('Gagal Menghapus', error, 'Catatan belum dapat dihapus.'); } } },
    ]);

    return (
        <View style={tw`flex-1 bg-gray-50 dark:bg-gray-900`}>
            <View style={tw`bg-white dark:bg-gray-800 px-5 py-4 border-b border-gray-200 dark:border-gray-700`}>
                <View style={tw`flex-row items-center justify-between`}>
                    <View><Text style={tw`text-xl font-black text-gray-900 dark:text-white`}>Pengeluaran</Text><Text style={tw`text-xs text-gray-500 dark:text-gray-400 mt-0.5`}>{user?.name || 'Kasir'} • operasional usaha</Text></View>
                    <TouchableOpacity onPress={openForm} style={tw`bg-blue-600 px-4 py-2.5 rounded-xl flex-row items-center`}><Icon name="plus" size={17} color="white" /><Text style={tw`text-white font-black text-sm ml-1`}>Tambah</Text></TouchableOpacity>
                </View>
                <View style={tw`flex-row bg-gray-100 dark:bg-gray-900 rounded-xl p-1 mt-4`}>
                    {([['EXPENSE', 'Operasional'], ['PURCHASE', 'Pembelian']] as const).map(([key, label]) => <TouchableOpacity key={key} onPress={() => setActiveType(key)} style={tw`flex-1 py-2.5 rounded-lg items-center ${activeType === key ? 'bg-white dark:bg-gray-700' : ''}`}><Text style={tw`text-xs font-black ${activeType === key ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500'}`}>{label}</Text></TouchableOpacity>)}
                </View>
            </View>
            <View style={tw`mx-4 mt-4 bg-blue-600 rounded-2xl p-5`}><Text style={tw`text-blue-100 text-xs font-bold uppercase`}>Total {activeType === 'PURCHASE' ? 'pembelian' : 'pengeluaran'}</Text><Text style={tw`text-white text-3xl font-black mt-1`}>{rupiah(total)}</Text><Text style={tw`text-blue-100 text-xs mt-1`}>{items.length} catatan</Text></View>
            {loading && items.length === 0 ? <View style={tw`flex-1 items-center justify-center`}><ActivityIndicator color="#2563EB" /></View> : (
                <FlatList data={items} keyExtractor={item => String(item.id)} contentContainerStyle={tw`p-4 pb-24`} ListEmptyComponent={<View style={tw`items-center py-16`}><Icon name="wallet-outline" size={42} color="#CBD5E1" /><Text style={tw`text-gray-400 font-bold mt-3`}>Belum ada data</Text></View>} renderItem={({ item }) => (
                    <TouchableOpacity onLongPress={() => remove(item)} style={tw`bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-gray-700 flex-row items-center`}>
                        <View style={tw`w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 items-center justify-center mr-3`}><Icon name={activeType === 'PURCHASE' ? 'cart-outline' : 'wallet-outline'} size={20} color="#EF4444" /></View>
                        <View style={tw`flex-1`}><Text style={tw`font-bold text-gray-900 dark:text-white`}>{item.description}</Text><Text style={tw`text-[10px] text-gray-400 mt-1`}>{item.category || 'Umum'} • {new Date(item.createdAt).toLocaleString('id-ID')}</Text></View>
                        <Text style={tw`font-black text-red-500 ml-3`}>{rupiah(item.amount)}</Text>
                    </TouchableOpacity>
                )} />
            )}
            <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => !saving && setModalOpen(false)}>
                <View style={tw`flex-1 bg-black/50 justify-end`}><View style={tw`bg-white dark:bg-gray-800 rounded-t-3xl max-h-[88%]`}>
                    <View style={tw`px-6 pt-5 pb-4 border-b border-gray-100 dark:border-gray-700 flex-row items-center justify-between`}><Text style={tw`text-xl font-black text-gray-900 dark:text-white`}>Tambah {activeType === 'PURCHASE' ? 'Pembelian' : 'Pengeluaran'}</Text><TouchableOpacity onPress={() => setModalOpen(false)}><Icon name="close" size={22} color="#64748B" /></TouchableOpacity></View>
                    <ScrollView contentContainerStyle={tw`p-6 pb-10`} keyboardShouldPersistTaps="handled">
                        <TextInput value={description} onChangeText={setDescription} placeholder="Keterangan" style={tw`bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-gray-900 dark:text-white mb-4`} placeholderTextColor="#94A3B8" />
                        <View style={tw`flex-row items-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl mb-4 overflow-hidden`}><Text style={tw`font-black text-gray-500 px-4`}>Rp</Text><TextInput value={amount ? Number(amount).toLocaleString('id-ID') : ''} onChangeText={value => setAmount(value.replace(/[^0-9]/g, ''))} keyboardType="numeric" placeholder="0" style={tw`flex-1 py-3 pr-4 text-lg font-black text-gray-900 dark:text-white`} placeholderTextColor="#94A3B8" /></View>
                        <Text style={tw`text-xs font-bold text-gray-600 dark:text-gray-300 mb-2`}>Kategori</Text><View style={tw`flex-row flex-wrap mb-5`}>{categories.map(option => <TouchableOpacity key={option} onPress={() => setCategory(option)} style={tw`px-3 py-2 rounded-full border mr-2 mb-2 ${category === option ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700'}`}><Text style={tw`text-xs font-bold ${category === option ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>{option}</Text></TouchableOpacity>)}</View>
                        <TouchableOpacity disabled={saving} onPress={save} style={tw`bg-blue-600 py-4 rounded-xl items-center ${saving ? 'opacity-60' : ''}`}><Text style={tw`text-white font-black`}>{saving ? 'Menyimpan...' : 'Simpan Pengeluaran'}</Text></TouchableOpacity>
                    </ScrollView>
                </View></View>
            </Modal>
        </View>
    );
}
