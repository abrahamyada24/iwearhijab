import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TouchableOpacity, FlatList, TextInput, Alert, Modal
} from 'react-native';
import tw, { useAppColorScheme } from 'twrnc';
import { getDBConnection } from '../database/db';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function CategoryListScreen({ navigation }: any) {
    useAppColorScheme(tw);
    const [categories, setCategories] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [categoryName, setCategoryName] = useState('');

    const loadData = useCallback(async () => {
        try {
            const db = await getDBConnection();
            const [res] = await db.executeSql(`
                SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.categoryId = c.id) as productCount
                FROM categories c ORDER BY c.name
            `);
            const arr: any[] = [];
            for (let i = 0; i < res.rows.length; i++) arr.push(res.rows.item(i));
            setCategories(arr);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        loadData();
        const unsub = navigation.addListener('focus', loadData);
        return unsub;
    }, [navigation, loadData]);

    const openAdd = () => { setEditing(null); setCategoryName(''); setShowModal(true); };
    const openEdit = (cat: any) => { setEditing(cat); setCategoryName(cat.name); setShowModal(true); };

    const handleSave = async () => {
        const trimmedName = categoryName.trim();
        if (!trimmedName) return Alert.alert('Validasi', 'Nama kategori wajib diisi.');
        if (trimmedName.length < 3) return Alert.alert('Validasi', 'Nama kategori minimal 3 karakter.');

        try {
            const db = await getDBConnection();
            if (editing) {
                await db.executeSql('UPDATE categories SET name = ?, isSynced = 0 WHERE id = ?', [trimmedName, editing.id]);
            } else {
                await db.executeSql('INSERT INTO categories (name) VALUES (?)', [trimmedName]);
            }
            setShowModal(false);
            setCategoryName('');
            setEditing(null);
            loadData();
        } catch (e) { Alert.alert('Error', 'Gagal menyimpan kategori.'); }
    };

    const handleDelete = (id: number) => {
        Alert.alert('Konfirmasi', 'Yakin ingin menghapus kategori ini?', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Hapus', style: 'destructive', onPress: async () => {
                    const db = await getDBConnection();
                    await db.executeSql('DELETE FROM categories WHERE id = ?', [id]);
                    loadData();
                }
            }
        ]);
    };

    const filtered = searchQuery.trim()
        ? categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : categories;

    return (
        <View style={tw`flex-1 bg-gray-50 dark:bg-gray-900`}>
            <View style={tw`bg-white dark:bg-gray-800 px-4 py-3 flex-row items-center border-b border-gray-200 dark:border-gray-700`}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 mr-2`}>
                    <Icon name="arrow-left" size={24} color={tw.color('gray-800')} />
                </TouchableOpacity>
                <Text style={tw`text-xl font-black text-gray-800 dark:text-gray-100 flex-1`}>Kategori ({categories.length})</Text>
                <TouchableOpacity style={tw`bg-blue-600 px-4 py-2 rounded-xl flex-row items-center`} onPress={openAdd}>
                    <Icon name="plus" size={16} color={tw.color('white')} style={tw`mr-1`} />
                    <Text style={tw`font-bold text-white text-sm`}>Tambah</Text>
                </TouchableOpacity>
            </View>

            <View style={tw`bg-white dark:bg-gray-800 px-4 py-2 border-b border-gray-100 dark:border-gray-800`}>
                <View style={tw`flex-row items-center bg-gray-50 dark:bg-gray-900 rounded-xl px-3`}>
                    <Icon name="magnify" size={14} color={tw.color('gray-400')} style={tw`mr-2`} />
                    <TextInput style={tw`flex-1 py-2.5 text-gray-800 dark:text-gray-100 text-sm`}
                        placeholder="Cari kategori..." placeholderTextColor={tw.color('gray-400')}
                        value={searchQuery} onChangeText={setSearchQuery} />
                    {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Icon name="close" size={14} color={tw.color('gray-400')} /></TouchableOpacity>}
                </View>
            </View>

            <FlatList data={filtered} keyExtractor={item => String(item.id)} contentContainerStyle={tw`p-4 pb-10`}
                ListEmptyComponent={() => (
                    <View style={tw`items-center py-20`}>
                        <Icon name="tag-outline" size={48} color={tw.color('gray-300')} />
                        <Text style={tw`text-gray-400 font-bold mt-4`}>Belum ada kategori</Text>
                    </View>
                )}
                renderItem={({ item }) => (
                    <View style={tw`bg-white dark:bg-gray-800 px-4 py-3 rounded-xl shadow-sm mb-3 border border-gray-100 dark:border-gray-800 flex-row justify-between items-center`}>
                        <TouchableOpacity style={tw`flex-1 mr-3`} onPress={() => openEdit(item)} activeOpacity={0.7}>
                            <Text style={tw`font-bold text-gray-800 dark:text-gray-100`}>{item.name}</Text>
                            <Text style={tw`text-xs text-gray-400 mt-0.5`}>{item.productCount || 0} produk</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={tw`p-2 bg-red-50 rounded-lg`} onPress={() => handleDelete(item.id)}>
                            <Icon name="delete-outline" size={16} color={tw.color('red-600')} />
                        </TouchableOpacity>
                    </View>
                )}
            />

            <Modal visible={showModal} transparent animationType="fade">
                <View style={tw`flex-1 bg-black/50 justify-center px-4`}>
                    <View style={tw`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl`}>
                        <View style={tw`flex-row justify-between items-center mb-5`}>
                            <Text style={tw`font-black text-xl text-gray-800 dark:text-gray-100`}>{editing ? 'Edit Kategori' : 'Kategori Baru'}</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}><Icon name="close" size={24} color={tw.color('gray-400')} /></TouchableOpacity>
                        </View>
                        <TextInput style={tw`bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-5 text-gray-800 dark:text-gray-100`}
                            placeholder="Contoh: Makanan Berat" value={categoryName} onChangeText={setCategoryName} />
                        <TouchableOpacity style={tw`bg-gray-900 py-3 rounded-xl items-center flex-row justify-center`} onPress={handleSave}>
                            <Icon name="content-save" size={18} color="white" style={tw`mr-2`} />
                            <Text style={tw`font-bold text-white`}>Simpan Kategori</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
