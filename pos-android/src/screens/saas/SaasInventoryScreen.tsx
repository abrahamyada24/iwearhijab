import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw, { useAppColorScheme } from 'twrnc';
import api, { showApiError } from '../../services/api';
import { fetchProducts } from '../../services/saasDataService';

export default function SaasInventoryScreen({ navigation }: any) {
    useAppColorScheme(tw);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<any>(null);
    const [type, setType] = useState<'IN' | 'OUT'>('IN');
    const [qty, setQty] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setProducts(await fetchProducts());
        } catch (error: any) {
            showApiError('Gagal Memuat Stok', error, 'Data stok belum dapat dimuat.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const openAdjustment = (product: any) => {
        setSelected(product);
        setType('IN');
        setQty('');
        setDescription('');
    };

    const save = async () => {
        const amount = Number(qty);
        if (!Number.isInteger(amount) || amount <= 0) {
            Alert.alert('Jumlah Tidak Valid', 'Jumlah stok harus berupa angka lebih dari 0.');
            return;
        }
        setSaving(true);
        try {
            await api.post('/inventory/adjustment', {
                productId: selected.id,
                type,
                qty: amount,
                description: description.trim() || (type === 'IN' ? 'Stok masuk dari Android' : 'Penyesuaian stok dari Android'),
            });
            setSelected(null);
            await load();
            Alert.alert('Stok Diperbarui', 'Perubahan stok sudah tersimpan di server.');
        } catch (error: any) {
            showApiError('Gagal Memperbarui Stok', error, 'Penyesuaian stok belum dapat disimpan.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
            <View style={tw`bg-white dark:bg-gray-900 px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex-row items-center`}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 mr-2`}>
                    <Icon name="arrow-left" size={23} color={tw.color('gray-700')} />
                </TouchableOpacity>
                <View style={tw`flex-1`}>
                    <Text style={tw`text-xl font-black text-gray-900 dark:text-white`}>Persediaan</Text>
                    <Text style={tw`text-xs text-gray-400`}>Stok usaha aktif di backend</Text>
                </View>
            </View>

            {loading && products.length === 0 ? (
                <View style={tw`flex-1 items-center justify-center`}><ActivityIndicator color={tw.color('blue-600')} /></View>
            ) : (
                <FlatList
                    data={products.filter(product => product.isActive !== false)}
                    keyExtractor={item => String(item.id)}
                    contentContainerStyle={tw`p-4 pb-10`}
                    ListEmptyComponent={<Text style={tw`text-center text-gray-400 mt-16`}>Belum ada produk.</Text>}
                    renderItem={({ item }) => (
                        <View style={tw`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-3 flex-row items-center`}>
                            <View style={tw`flex-1`}>
                                <Text style={tw`font-black text-gray-900 dark:text-white`}>{item.name}</Text>
                                <Text style={tw`text-xs text-gray-400 mt-1`}>{item.sku || '-'} • {item.category?.name || 'Tanpa kategori'}</Text>
                            </View>
                            <View style={tw`items-end mr-3`}>
                                <Text style={tw`text-lg font-black text-blue-600`}>{item.isUnlimitedStock ? '∞' : Number(item.stock || 0)}</Text>
                                <Text style={tw`text-[10px] text-gray-400`}>{item.unitLabel || 'pcs'}</Text>
                            </View>
                            {!item.isUnlimitedStock && (
                                <TouchableOpacity onPress={() => openAdjustment(item)} style={tw`bg-blue-50 p-3 rounded-xl`}>
                                    <Icon name="swap-vertical" size={21} color={tw.color('blue-600')} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                />
            )}

            <Modal visible={Boolean(selected)} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
                <View style={tw`flex-1 bg-black/50 justify-end`}>
                    <View style={tw`bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-10`}>
                        <View style={tw`flex-row items-center mb-1`}>
                            <Text style={tw`text-xl font-black text-gray-900 dark:text-white flex-1`}>Sesuaikan Stok</Text>
                            <TouchableOpacity onPress={() => setSelected(null)}><Icon name="close" size={24} color={tw.color('gray-500')} /></TouchableOpacity>
                        </View>
                        <Text style={tw`text-sm text-gray-500 mb-5`}>{selected?.name} • stok saat ini {selected?.stock || 0}</Text>
                        <View style={tw`flex-row mb-4`}>
                            {(['IN', 'OUT'] as const).map(value => (
                                <TouchableOpacity key={value} onPress={() => setType(value)} style={type === value ? tw`flex-1 bg-blue-600 rounded-xl py-3 mx-1 items-center` : tw`flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl py-3 mx-1 items-center`}>
                                    <Text style={type === value ? tw`text-white font-black` : tw`text-gray-500 font-black`}>{value === 'IN' ? 'Stok Masuk' : 'Stok Keluar'}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput value={qty} onChangeText={value => setQty(value.replace(/[^0-9]/g, ''))} placeholder="Jumlah" keyboardType="numeric" style={tw`border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />
                        <TextInput value={description} onChangeText={setDescription} placeholder="Keterangan (opsional)" style={tw`border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-4 text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />
                        <TouchableOpacity disabled={saving} onPress={save} style={tw`bg-gray-900 rounded-xl py-4 items-center`}>
                            {saving ? <ActivityIndicator color="white" /> : <Text style={tw`text-white font-black`}>Simpan Penyesuaian</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
