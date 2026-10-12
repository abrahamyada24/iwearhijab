import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw, { useAppColorScheme } from 'twrnc';
import api, { showApiError } from '../../services/api';
import { useStore } from '../../store/useStore';

export default function SaasTeamScreen({ navigation }: any) {
    useAppColorScheme(tw);
    const currentUser = useStore(state => state.user);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'ADMIN' | 'CASHIER'>('CASHIER');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/users');
            setUsers(response.data?.data || []);
        } catch (error: any) {
            showApiError('Gagal Memuat Pegawai', error, 'Pegawai belum dapat dimuat.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const save = async () => {
        if (!name.trim() || !email.trim() || password.length < 12) {
            Alert.alert('Data Belum Lengkap', 'Nama, email, dan password minimal 12 karakter wajib diisi.');
            return;
        }
        setSaving(true);
        try {
            const form = new FormData();
            form.append('name', name.trim());
            form.append('email', email.trim().toLowerCase());
            if (username.trim()) form.append('username', username.trim().toLowerCase());
            form.append('password', password);
            form.append('role', role);
            await api.post('/auth/register', form, { headers: { 'Content-Type': 'multipart/form-data' } });
            setModalOpen(false);
            setName(''); setEmail(''); setUsername(''); setPassword(''); setRole('CASHIER');
            await load();
        } catch (error: any) {
            showApiError('Gagal Menambah Pegawai', error, 'Pegawai belum dapat dibuat.');
        } finally {
            setSaving(false);
        }
    };

    const remove = (user: any) => Alert.alert('Hapus Akses', `Cabut akses ${user.name} dari usaha ini?`, [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: async () => {
            try { await api.delete(`/users/${user.id}`); await load(); }
            catch (error: any) { showApiError('Gagal Menghapus Akses', error, 'Akses belum dapat dihapus.'); }
        } },
    ]);

    return (
        <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
            <View style={tw`bg-white dark:bg-gray-900 px-4 py-4 border-b border-gray-200 dark:border-gray-800 flex-row items-center`}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 mr-2`}><Icon name="arrow-left" size={23} color={tw.color('gray-700')} /></TouchableOpacity>
                <View style={tw`flex-1`}><Text style={tw`text-xl font-black text-gray-900 dark:text-white`}>Pegawai</Text><Text style={tw`text-xs text-gray-400`}>Khusus usaha aktif</Text></View>
                <TouchableOpacity onPress={() => setModalOpen(true)} style={tw`bg-blue-600 p-3 rounded-xl`}><Icon name="account-plus" size={21} color="white" /></TouchableOpacity>
            </View>
            {loading && users.length === 0 ? <View style={tw`flex-1 items-center justify-center`}><ActivityIndicator color={tw.color('blue-600')} /></View> : (
                <FlatList
                    data={users}
                    keyExtractor={item => String(item.id)}
                    contentContainerStyle={tw`p-4`}
                    renderItem={({ item }) => (
                        <View style={tw`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-3 flex-row items-center`}>
                            <View style={tw`w-11 h-11 bg-purple-50 dark:bg-purple-900/30 rounded-full items-center justify-center mr-3`}><Icon name="account" size={23} color={tw.color('purple-600')} /></View>
                            <View style={tw`flex-1`}><Text style={tw`font-black text-gray-900 dark:text-white`}>{item.name}</Text><Text style={tw`text-xs text-gray-400 mt-1`}>{item.username || item.email} • {item.role}</Text></View>
                            {item.id !== currentUser?.id && item.role !== 'OWNER' && <TouchableOpacity onPress={() => remove(item)} style={tw`p-2`}><Icon name="trash-can-outline" size={20} color={tw.color('red-500')} /></TouchableOpacity>}
                        </View>
                    )}
                />
            )}

            <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
                <View style={tw`flex-1 bg-black/50 justify-end`}>
                    <View style={tw`bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-10`}>
                        <View style={tw`flex-row items-center mb-5`}><Text style={tw`text-xl font-black text-gray-900 dark:text-white flex-1`}>Tambah Pegawai</Text><TouchableOpacity onPress={() => setModalOpen(false)}><Icon name="close" size={24} color={tw.color('gray-500')} /></TouchableOpacity></View>
                        <TextInput value={name} onChangeText={setName} placeholder="Nama lengkap" style={tw`border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />
                        <TextInput value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" style={tw`border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />
                        <TextInput value={username} onChangeText={setUsername} placeholder="Username (opsional)" autoCapitalize="none" style={tw`border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />
                        <TextInput value={password} onChangeText={setPassword} placeholder="Password minimal 12 karakter" secureTextEntry style={tw`border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />
                        <View style={tw`flex-row mb-4`}>
                            {(['CASHIER', 'ADMIN'] as const).map(value => <TouchableOpacity key={value} onPress={() => setRole(value)} style={role === value ? tw`flex-1 bg-blue-600 rounded-xl py-3 mx-1 items-center` : tw`flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl py-3 mx-1 items-center`}><Text style={role === value ? tw`text-white font-black` : tw`text-gray-500 font-black`}>{value === 'CASHIER' ? 'Kasir' : 'Admin'}</Text></TouchableOpacity>)}
                        </View>
                        <TouchableOpacity disabled={saving} onPress={save} style={tw`bg-gray-900 rounded-xl py-4 items-center`}><Text style={tw`text-white font-black`}>{saving ? 'Menyimpan...' : 'Buat Akun Pegawai'}</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
