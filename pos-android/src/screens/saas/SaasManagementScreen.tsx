import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw, { useAppColorScheme } from 'twrnc';
import api, { showApiError } from '../../services/api';
import { fetchCategories, fetchCustomers, fetchProducts } from '../../services/saasDataService';

type Tab = 'products' | 'categories' | 'customers';
const rupiah = (value: unknown) => `Rp ${Math.round(Number(value || 0)).toLocaleString('id-ID')}`;

export default function SaasManagementScreen({ navigation }: any) {
    useAppColorScheme(tw);
    const [tab, setTab] = useState<Tab>('products');
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [phone, setPhone] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [productData, categoryData, customerData] = await Promise.all([fetchProducts(), fetchCategories(), fetchCustomers()]);
            setProducts(productData);
            setCategories(categoryData);
            setCustomers(customerData);
            if (!categoryId && categoryData[0]) setCategoryId(Number(categoryData[0].id));
        } catch (error: any) {
            showApiError('Gagal Memuat Data', error, 'Master data belum dapat dimuat.');
        } finally {
            setLoading(false);
        }
    }, [categoryId]);

    useEffect(() => { void load(); }, []);

    const resetForm = () => {
        setName(''); setPrice(''); setStock(''); setPhone('');
        setCategoryId(categories[0] ? Number(categories[0].id) : null);
    };

    const save = async () => {
        if (!name.trim()) return Alert.alert('Validasi', 'Nama wajib diisi.');
        setSaving(true);
        try {
            const form = new FormData();
            form.append('name', name.trim());
            if (tab === 'products') {
                if (!categoryId) throw new Error('Buat atau pilih kategori terlebih dahulu.');
                form.append('categoryId', String(categoryId));
                form.append('price', String(Number(price || 0)));
                form.append('costPrice', '0');
                form.append('stock', String(Number(stock || 0)));
                form.append('minStock', '0');
                form.append('isActive', 'true');
                form.append('isUnlimitedStock', 'false');
                form.append('unitLabel', 'pcs');
                await api.post('/products', form, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else if (tab === 'categories') {
                await api.post('/products/categories', form, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                form.append('phone', phone.trim());
                await api.post('/customers', form, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            setModalOpen(false);
            resetForm();
            await load();
        } catch (error: any) {
            showApiError('Gagal Menyimpan', error, error.message || 'Data belum dapat disimpan.');
        } finally {
            setSaving(false);
        }
    };

    const remove = (item: any) => Alert.alert('Hapus Data', `Hapus ${item.name}?`, [
        { text: 'Batal', style: 'cancel' },
        {
            text: 'Hapus', style: 'destructive', onPress: async () => {
                try {
                    const endpoint = tab === 'products' ? `/products/${item.id}` : tab === 'categories' ? `/products/categories/${item.id}` : `/customers/${item.id}`;
                    await api.delete(endpoint);
                    await load();
                } catch (error: any) {
                    showApiError('Gagal Menghapus', error, 'Data masih digunakan atau belum dapat dihapus.');
                }
            }
        },
    ]);

    const data = tab === 'products' ? products : tab === 'categories' ? categories : customers;

    return (
        <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
            <View style={tw`bg-white dark:bg-gray-900 px-4 py-4 border-b border-gray-200 dark:border-gray-800`}>
                <View style={tw`flex-row items-center`}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 mr-2`}><Icon name="arrow-left" size={23} color={tw.color('gray-700')} /></TouchableOpacity>
                    <View style={tw`flex-1`}><Text style={tw`text-xl font-black text-gray-900 dark:text-white`}>Master Data</Text><Text style={tw`text-xs text-gray-400`}>Tersimpan langsung ke backend</Text></View>
                    <TouchableOpacity onPress={() => { resetForm(); setModalOpen(true); }} style={tw`bg-blue-600 p-3 rounded-xl`}><Icon name="plus" size={21} color="white" /></TouchableOpacity>
                </View>
                <View style={tw`flex-row mt-4`}>
                    {(['products', 'categories', 'customers'] as Tab[]).map(value => (
                        <TouchableOpacity key={value} onPress={() => setTab(value)} style={tab === value ? tw`flex-1 bg-gray-900 rounded-xl py-2.5 mx-1 items-center` : tw`flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl py-2.5 mx-1 items-center`}>
                            <Text style={tab === value ? tw`text-white font-black text-xs` : tw`text-gray-500 font-black text-xs`}>{value === 'products' ? 'Produk' : value === 'categories' ? 'Kategori' : 'Pelanggan'}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {loading && data.length === 0 ? <View style={tw`flex-1 items-center justify-center`}><ActivityIndicator color={tw.color('blue-600')} /></View> : (
                <FlatList
                    data={data}
                    keyExtractor={item => String(item.id)}
                    contentContainerStyle={tw`p-4 pb-10`}
                    ListEmptyComponent={<Text style={tw`text-center text-gray-400 mt-16`}>Belum ada data.</Text>}
                    renderItem={({ item }) => (
                        <View style={tw`bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 mb-3 flex-row items-center`}>
                            <View style={tw`w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl items-center justify-center mr-3`}><Icon name={tab === 'customers' ? 'account' : tab === 'categories' ? 'shape' : 'package-variant'} size={20} color={tw.color('blue-600')} /></View>
                            <View style={tw`flex-1`}>
                                <Text style={tw`font-black text-gray-900 dark:text-white`}>{item.name}</Text>
                                {tab === 'products' && <Text style={tw`text-xs text-gray-400 mt-1`}>{rupiah(item.price)} • Stok {item.isUnlimitedStock ? '∞' : item.stock}</Text>}
                                {tab === 'customers' && <Text style={tw`text-xs text-gray-400 mt-1`}>{item.phone || item.memberId || 'Tanpa nomor telepon'}</Text>}
                            </View>
                            <TouchableOpacity onPress={() => remove(item)} style={tw`p-2`}><Icon name="trash-can-outline" size={20} color={tw.color('red-500')} /></TouchableOpacity>
                        </View>
                    )}
                />
            )}

            <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
                <View style={tw`flex-1 bg-black/50 justify-end`}>
                    <ScrollView style={tw`max-h-[85%] bg-white dark:bg-gray-900 rounded-t-3xl`} contentContainerStyle={tw`p-6 pb-10`} keyboardShouldPersistTaps="handled">
                        <View style={tw`flex-row items-center mb-5`}><Text style={tw`text-xl font-black text-gray-900 dark:text-white flex-1`}>Tambah {tab === 'products' ? 'Produk' : tab === 'categories' ? 'Kategori' : 'Pelanggan'}</Text><TouchableOpacity onPress={() => setModalOpen(false)}><Icon name="close" size={24} color={tw.color('gray-500')} /></TouchableOpacity></View>
                        <TextInput value={name} onChangeText={setName} placeholder="Nama" style={tw`border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />
                        {tab === 'products' && <>
                            <TextInput value={price} onChangeText={value => setPrice(value.replace(/[^0-9]/g, ''))} placeholder="Harga jual" keyboardType="numeric" style={tw`border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />
                            <TextInput value={stock} onChangeText={value => setStock(value.replace(/[^0-9]/g, ''))} placeholder="Stok awal" keyboardType="numeric" style={tw`border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />
                            <Text style={tw`font-bold text-gray-700 dark:text-gray-200 mb-2`}>Kategori</Text>
                            <View style={tw`flex-row flex-wrap mb-3`}>{categories.map(category => <TouchableOpacity key={category.id} onPress={() => setCategoryId(Number(category.id))} style={categoryId === Number(category.id) ? tw`bg-blue-600 rounded-full px-3 py-2 mr-2 mb-2` : tw`bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-2 mr-2 mb-2`}><Text style={categoryId === Number(category.id) ? tw`text-white font-bold text-xs` : tw`text-gray-600 dark:text-gray-300 font-bold text-xs`}>{category.name}</Text></TouchableOpacity>)}</View>
                        </>}
                        {tab === 'customers' && <TextInput value={phone} onChangeText={setPhone} placeholder="Nomor telepon (opsional)" keyboardType="phone-pad" style={tw`border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />}
                        <TouchableOpacity disabled={saving} onPress={save} style={tw`bg-gray-900 rounded-xl py-4 items-center mt-2`}><Text style={tw`text-white font-black`}>{saving ? 'Menyimpan...' : 'Simpan'}</Text></TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}
