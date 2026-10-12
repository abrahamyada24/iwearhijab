import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw, { useAppColorScheme } from 'twrnc';
import { fetchCategories, fetchProducts } from '../../services/saasDataService';
import { showApiError } from '../../services/api';
import { useStore } from '../../store/useStore';

const rupiah = (value: unknown) => `Rp ${Math.round(Number(value || 0)).toLocaleString('id-ID')}`;

export default function SaasPOSScreen({ navigation }: any) {
    useAppColorScheme(tw);
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const cart = useStore(state => state.cart);
    const addToCart = useStore(state => state.addToCart);
    const cartTotal = useStore(state => state.cartTotal);
    const settings = useStore(state => state.settings);
    const activeShift = useStore(state => state.activeShift);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [productData, categoryData] = await Promise.all([fetchProducts(), fetchCategories()]);
            setProducts(productData);
            setCategories(categoryData);
        } catch (error: any) {
            showApiError('Gagal Memuat Produk', error, 'Produk belum dapat dimuat dari server.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const filtered = useMemo(() => products.filter(product => {
        const matchesCategory = categoryId == null || Number(product.categoryId) === categoryId;
        const text = `${product.name || ''} ${product.sku || ''} ${product.barcode || ''}`.toLowerCase();
        return matchesCategory && text.includes(search.trim().toLowerCase()) && product.isActive !== false;
    }), [products, categoryId, search]);

    const add = (product: any) => {
        const existingQty = cart.filter(item => String(item.id) === String(product.id)).reduce((sum, item) => sum + item.quantity, 0);
        if (!product.isUnlimitedStock && !settings.allowNegativeStock && existingQty >= Number(product.stock || 0)) {
            Alert.alert('Stok Tidak Cukup', `${product.name} tidak memiliki stok yang cukup.`);
            return;
        }
        addToCart({
            ...product,
            price: Number(product.finalPrice ?? product.price ?? 0),
            originalPrice: Number(product.originalPrice ?? product.price ?? 0),
            stock: Number(product.stock || 0),
            isUnlimitedStock: product.isUnlimitedStock ? 1 : 0,
        });
    };

    const goCheckout = () => {
        if (settings.enableShift && !activeShift) {
            Alert.alert('Shift Belum Dibuka', 'Buka shift melalui halaman Beranda terlebih dahulu.');
            return;
        }
        navigation.navigate('Checkout');
    };

    return (
        <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
            <View style={tw`bg-white dark:bg-gray-900 px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800`}>
                <Text style={tw`text-xl font-black text-gray-900 dark:text-white mb-3`}>Kasir Online</Text>
                <View style={tw`flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-xl px-3`}>
                    <Icon name="magnify" size={20} color={tw.color('gray-400')} />
                    <TextInput value={search} onChangeText={setSearch} placeholder="Cari produk, SKU, atau barcode" style={tw`flex-1 px-3 py-3 text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />
                </View>
                <FlatList
                    horizontal
                    data={[{ id: null, name: 'Semua' }, ...categories]}
                    keyExtractor={item => String(item.id ?? 'all')}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={tw`pt-3`}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => setCategoryId(item.id == null ? null : Number(item.id))} style={[
                            tw`px-4 py-2 rounded-full mr-2 border`,
                            categoryId === item.id || (item.id == null && categoryId == null)
                                ? tw`bg-blue-600 border-blue-600`
                                : tw`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`,
                        ]}>
                            <Text style={categoryId === item.id || (item.id == null && categoryId == null) ? tw`text-white font-bold text-xs` : tw`text-gray-600 dark:text-gray-300 font-bold text-xs`}>{item.name}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {loading && products.length === 0 ? (
                <View style={tw`flex-1 items-center justify-center`}><ActivityIndicator size="large" color={tw.color('blue-600')} /></View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={item => String(item.id)}
                    numColumns={2}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
                    contentContainerStyle={tw`p-3 pb-28`}
                    columnWrapperStyle={tw`flex-row`}
                    ListEmptyComponent={<Text style={tw`text-center text-gray-400 mt-16`}>Produk tidak ditemukan.</Text>}
                    renderItem={({ item }) => (
                        <TouchableOpacity onPress={() => add(item)} style={tw`flex-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 m-1.5 min-h-36`}>
                            <View style={tw`w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 items-center justify-center mb-3`}>
                                <Icon name="package-variant-closed" size={22} color={tw.color('blue-600')} />
                            </View>
                            <Text numberOfLines={2} style={tw`font-black text-gray-900 dark:text-white flex-1`}>{item.name}</Text>
                            <Text style={tw`font-black text-blue-600 mt-2`}>{rupiah(item.finalPrice ?? item.price)}</Text>
                            <Text style={tw`text-[10px] text-gray-400 mt-1`}>{item.isUnlimitedStock ? 'Stok tak terbatas' : `Stok ${item.stock || 0}`}</Text>
                        </TouchableOpacity>
                    )}
                />
            )}

            {cart.length > 0 && (
                <TouchableOpacity onPress={goCheckout} style={tw`absolute left-4 right-4 bottom-4 bg-gray-900 rounded-2xl px-5 py-4 flex-row items-center shadow-lg`}>
                    <View style={tw`w-8 h-8 bg-blue-500 rounded-full items-center justify-center mr-3`}><Text style={tw`text-white font-black`}>{cart.reduce((sum, item) => sum + item.quantity, 0)}</Text></View>
                    <Text style={tw`text-white font-black flex-1`}>Lihat Keranjang</Text>
                    <Text style={tw`text-white font-black mr-2`}>{rupiah(cartTotal())}</Text>
                    <Icon name="chevron-right" size={22} color="white" />
                </TouchableOpacity>
            )}
        </View>
    );
}
