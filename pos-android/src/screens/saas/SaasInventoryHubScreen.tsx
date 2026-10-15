import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw, { useAppColorScheme } from 'twrnc';
import { fetchCategories, fetchProducts } from '../../services/saasDataService';
import { showApiError } from '../../services/api';

type MenuCard = {
    key: string;
    label: string;
    sublabel: string;
    icon: string;
    color: string;
    background: string;
    route: string;
};

export default function SaasInventoryHubScreen({ navigation }: any) {
    useAppColorScheme(tw);
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        setRefreshing(true);
        try {
            const [productData, categoryData] = await Promise.all([fetchProducts(), fetchCategories()]);
            setProducts(productData);
            setCategories(categoryData);
        } catch (error: any) {
            showApiError('Gagal Memuat Inventori', error, 'Data inventori belum dapat dimuat.');
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void load();
        const unsubscribe = navigation.addListener('focus', load);
        return unsubscribe;
    }, [load, navigation]);

    const activeProducts = products.filter(item => item.isActive !== false);
    const lowStock = activeProducts.filter(item => !item.isUnlimitedStock && Number(item.stock || 0) <= 5);
    const cards = useMemo<MenuCard[]>(() => [
        { key: 'products', label: 'Produk', sublabel: `${activeProducts.length} item`, icon: 'package-variant', color: '#2563EB', background: 'bg-blue-50 dark:bg-blue-900/30', route: 'Management' },
        { key: 'categories', label: 'Kategori', sublabel: `${categories.length} kategori`, icon: 'tag-outline', color: '#9333EA', background: 'bg-purple-50 dark:bg-purple-900/30', route: 'Management' },
        { key: 'stock', label: 'Persediaan', sublabel: 'Stok masuk/keluar', icon: 'chart-bar', color: '#D97706', background: 'bg-amber-50 dark:bg-amber-900/30', route: 'Inventory' },
        { key: 'team', label: 'Pegawai', sublabel: 'Owner, admin & kasir', icon: 'account-group-outline', color: '#059669', background: 'bg-emerald-50 dark:bg-emerald-900/30', route: 'Team' },
    ], [activeProducts.length, categories.length]);

    return (
        <View style={tw`flex-1 bg-gray-50 dark:bg-gray-900`}>
            <View style={tw`bg-white dark:bg-gray-800 px-6 pt-4 pb-5 border-b border-gray-100 dark:border-gray-700`}>
                <Text style={tw`text-2xl font-black text-gray-800 dark:text-gray-100`}>Inventori</Text>
                <Text style={tw`text-gray-500 dark:text-gray-400 text-sm mt-1`}>Kelola inventori dan produk Anda</Text>
            </View>
            <ScrollView
                contentContainerStyle={tw`p-4 pb-10`}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
            >
                {lowStock.length > 0 && (
                    <TouchableOpacity style={tw`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-3 mb-4 flex-row items-center`} onPress={() => navigation.navigate('Inventory')}>
                        <View style={tw`w-8 h-8 bg-amber-100 dark:bg-amber-800 rounded-full items-center justify-center mr-3`}><Text style={tw`font-black text-amber-600 text-xs`}>{lowStock.length}</Text></View>
                        <View style={tw`flex-1`}><Text style={tw`font-bold text-amber-800 dark:text-amber-200 text-sm`}>Stok Rendah</Text><Text style={tw`text-amber-600 dark:text-amber-400 text-xs`}>{lowStock.length} produk stok ≤ 5</Text></View>
                        <Icon name="arrow-right" size={16} color="#D97706" />
                    </TouchableOpacity>
                )}
                {refreshing && products.length === 0 ? <ActivityIndicator style={tw`my-12`} color="#2563EB" /> : (
                    <View style={tw`flex-row flex-wrap justify-between`}>
                        {cards.map(card => (
                            <TouchableOpacity key={card.key} style={[tw`w-[48%] rounded-2xl p-4 mb-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700`, { minHeight: 130 }]} onPress={() => navigation.navigate(card.route)} activeOpacity={0.8}>
                                <View style={tw`w-10 h-10 ${card.background} rounded-xl items-center justify-center mb-3`}><Icon name={card.icon} size={20} color={card.color} /></View>
                                <Text style={tw`font-black text-base text-gray-800 dark:text-gray-100 mb-1`}>{card.label}</Text>
                                <View style={tw`flex-row items-center justify-between`}><Text style={tw`text-xs text-gray-500 dark:text-gray-400`}>{card.sublabel}</Text><Icon name="arrow-right" size={14} color={card.color} /></View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
