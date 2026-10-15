import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw, { useAppColorScheme } from 'twrnc';
import api, { showApiError } from '../../services/api';
import { fetchCustomers } from '../../services/saasDataService';
import { useStore } from '../../store/useStore';

type ContactTab = 'customer' | 'supplier';

export default function SaasContactScreen() {
    useAppColorScheme(tw);
    const user = useStore(state => state.user);
    const isManager = ['OWNER', 'ADMIN'].includes(String(user?.role || '').toUpperCase());
    const [tab, setTab] = useState<ContactTab>('customer');
    const [customers, setCustomers] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [customerData, supplierResponse] = await Promise.all([fetchCustomers(), api.get('/suppliers')]);
            setCustomers(customerData);
            setSuppliers(supplierResponse.data?.data || []);
        } catch (error: any) {
            showApiError('Gagal Memuat Kontak', error, 'Data pelanggan dan supplier belum dapat dimuat.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const openForm = (item?: any) => {
        setEditing(item || null);
        setName(item?.name || '');
        setPhone(item?.phone || '');
        setEmail(item?.email || '');
        setAddress(item?.address || '');
        setNotes(item?.notes || '');
        setModalOpen(true);
    };

    const save = async () => {
        if (!name.trim()) return Alert.alert('Data Belum Lengkap', 'Nama wajib diisi.');
        setSaving(true);
        try {
            if (tab === 'customer') {
                const form = new FormData();
                form.append('name', name.trim());
                form.append('phone', phone.trim());
                form.append('email', email.trim());
                form.append('notes', notes.trim());
                if (editing) await api.put(`/customers/${editing.id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
                else await api.post('/customers', form, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                const payload = { name: name.trim(), phone: phone.trim() || null, address: address.trim() || null, notes: notes.trim() || null };
                if (editing) await api.put(`/suppliers/${editing.id}`, payload);
                else await api.post('/suppliers', payload);
            }
            setModalOpen(false);
            await load();
        } catch (error: any) {
            showApiError('Gagal Menyimpan Kontak', error, 'Kontak belum dapat disimpan.');
        } finally {
            setSaving(false);
        }
    };

    const remove = (item: any) => Alert.alert('Hapus Kontak', `Hapus ${item.name}?`, [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: async () => {
            try {
                await api.delete(tab === 'customer' ? `/customers/${item.id}` : `/suppliers/${item.id}`);
                await load();
            } catch (error: any) {
                showApiError('Gagal Menghapus', error, 'Kontak masih digunakan atau belum dapat dihapus.');
            }
        } },
    ]);

    const data = tab === 'customer' ? customers : suppliers;
    return (
        <View style={tw`flex-1 bg-gray-50 dark:bg-gray-900`}>
            <View style={tw`bg-white dark:bg-gray-800 px-5 pt-4 pb-4 border-b border-gray-100 dark:border-gray-700`}>
                <View style={tw`flex-row items-center`}>
                    <View style={tw`flex-1`}><Text style={tw`text-2xl font-black text-gray-800 dark:text-gray-100`}>Kontak</Text><Text style={tw`text-sm text-gray-500 dark:text-gray-400 mt-1`}>Pelanggan dan supplier usaha</Text></View>
                    {isManager && <TouchableOpacity onPress={() => openForm()} style={tw`bg-blue-600 w-11 h-11 rounded-xl items-center justify-center`}><Icon name="plus" size={23} color="white" /></TouchableOpacity>}
                </View>
                <View style={tw`flex-row bg-gray-100 dark:bg-gray-900 rounded-xl p-1 mt-4`}>
                    {([['customer', 'Pelanggan'], ['supplier', 'Supplier']] as const).map(([key, label]) => <TouchableOpacity key={key} onPress={() => setTab(key)} style={tw`flex-1 py-2.5 rounded-lg items-center ${tab === key ? 'bg-white dark:bg-gray-700' : ''}`}><Text style={tw`text-xs font-black ${tab === key ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500'}`}>{label}</Text></TouchableOpacity>)}
                </View>
            </View>
            {loading && data.length === 0 ? <View style={tw`flex-1 items-center justify-center`}><ActivityIndicator color="#2563EB" /></View> : (
                <FlatList
                    data={data}
                    keyExtractor={item => String(item.id)}
                    contentContainerStyle={tw`p-4 pb-24`}
                    ListEmptyComponent={<View style={tw`items-center py-16`}><Icon name="account-multiple-outline" size={44} color="#CBD5E1" /><Text style={tw`text-gray-400 font-bold mt-3`}>Belum ada kontak</Text></View>}
                    renderItem={({ item }) => (
                        <TouchableOpacity disabled={!isManager} onPress={() => openForm(item)} style={tw`bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 border border-gray-100 dark:border-gray-700 flex-row items-center`}>
                            <View style={tw`w-11 h-11 rounded-full ${tab === 'customer' ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30'} items-center justify-center mr-3`}><Icon name={tab === 'customer' ? 'account' : 'truck-outline'} size={22} color={tab === 'customer' ? '#2563EB' : '#059669'} /></View>
                            <View style={tw`flex-1`}><Text style={tw`font-black text-gray-900 dark:text-white`}>{item.name}</Text><Text style={tw`text-xs text-gray-400 mt-1`}>{item.phone || item.email || item.address || 'Tanpa informasi tambahan'}</Text>{item.memberId ? <Text style={tw`text-[10px] text-blue-500 mt-1`}>{item.memberId} • {item.points || 0} poin</Text> : null}</View>
                            {isManager && <TouchableOpacity onPress={() => remove(item)} style={tw`p-2`}><Icon name="trash-can-outline" size={19} color="#EF4444" /></TouchableOpacity>}
                        </TouchableOpacity>
                    )}
                />
            )}
            <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
                <View style={tw`flex-1 bg-black/50 justify-end`}>
                    <View style={tw`bg-white dark:bg-gray-800 rounded-t-3xl p-6 pb-10`}>
                        <View style={tw`flex-row items-center mb-5`}><Text style={tw`text-xl font-black text-gray-900 dark:text-white flex-1`}>{editing ? 'Edit' : 'Tambah'} {tab === 'customer' ? 'Pelanggan' : 'Supplier'}</Text><TouchableOpacity onPress={() => setModalOpen(false)}><Icon name="close" size={24} color="#64748B" /></TouchableOpacity></View>
                        <TextInput value={name} onChangeText={setName} placeholder="Nama" style={tw`bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white`} placeholderTextColor="#94A3B8" />
                        <TextInput value={phone} onChangeText={setPhone} placeholder="Nomor telepon" keyboardType="phone-pad" style={tw`bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white`} placeholderTextColor="#94A3B8" />
                        {tab === 'customer' ? <TextInput value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" style={tw`bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white`} placeholderTextColor="#94A3B8" /> : <TextInput value={address} onChangeText={setAddress} placeholder="Alamat supplier" style={tw`bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white`} placeholderTextColor="#94A3B8" />}
                        <TextInput value={notes} onChangeText={setNotes} placeholder="Catatan" multiline style={tw`bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 mb-4 text-gray-900 dark:text-white`} placeholderTextColor="#94A3B8" />
                        <TouchableOpacity disabled={saving} onPress={save} style={tw`bg-blue-600 py-4 rounded-xl items-center ${saving ? 'opacity-60' : ''}`}><Text style={tw`text-white font-black`}>{saving ? 'Menyimpan...' : 'Simpan'}</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
