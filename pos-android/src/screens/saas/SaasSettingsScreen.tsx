import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw, { useAppColorScheme } from 'twrnc';
import api, { showApiError } from '../../services/api';
import { loadDeviceSettings, normalizeServerSettings, saveDeviceSettings } from '../../services/saasDataService';
import { useStore } from '../../store/useStore';

export default function SaasSettingsScreen() {
    const [, , setColorScheme] = useAppColorScheme(tw);
    const user = useStore(state => state.user);
    const settings = useStore(state => state.settings);
    const setSettings = useStore(state => state.setSettings);
    const [form, setForm] = useState<any>(settings);
    const [saving, setSaving] = useState(false);
    const isManager = ['OWNER', 'ADMIN'].includes(String(user?.role || '').toUpperCase());

    useEffect(() => {
        setForm(settings);
    }, [settings]);

    const save = async () => {
        setSaving(true);
        try {
            const device = await loadDeviceSettings();
            const nextDevice = { ...device, theme: form.theme, showLogoOnReceipt: form.showLogoOnReceipt };
            await saveDeviceSettings(nextDevice);

            if (isManager) {
                const serverForm = new FormData();
                serverForm.append('storeName', form.storeName || 'LitePOS');
                serverForm.append('address', form.storeAddress || '');
                serverForm.append('phone', form.storePhone || '');
                serverForm.append('enableShift', String(Boolean(form.enableShift)));
                serverForm.append('enablePreOrder', String(Boolean(form.enablePreOrder)));
                serverForm.append('showImages', String(Boolean(form.showImages)));
                serverForm.append('allowNegativeStock', String(Boolean(form.allowNegativeStock)));
                serverForm.append('receiptFooter', form.receiptFooter || '');
                const response = await api.put('/settings', serverForm, { headers: { 'Content-Type': 'multipart/form-data' } });
                const loyalty = await api.get('/settings/loyalty');
                const normalized = await normalizeServerSettings(response.data?.data, loyalty.data?.data, nextDevice);
                setSettings({
                    ...normalized,
                    license_number: settings.license_number,
                    license_status: settings.license_status,
                    license_expire_date: settings.license_expire_date,
                    license_type: settings.license_type,
                });
            } else {
                setSettings({ ...settings, ...nextDevice });
            }
            setColorScheme(form.theme);
            Alert.alert('Tersimpan', 'Pengaturan berhasil disimpan.');
        } catch (error: any) {
            showApiError('Gagal Menyimpan', error, 'Pengaturan belum dapat disimpan.');
        } finally {
            setSaving(false);
        }
    };

    const update = (key: string, value: any) => setForm((current: any) => ({ ...current, [key]: value }));

    return (
        <ScrollView style={tw`flex-1 bg-gray-50 dark:bg-gray-950`} contentContainerStyle={tw`p-5 pb-12`}>
            <Text style={tw`text-2xl font-black text-gray-900 dark:text-white`}>Pengaturan</Text>
            <Text style={tw`text-xs text-gray-400 mt-1 mb-5`}>Kelola profil usaha dan pengaturan perangkat</Text>

            <View style={tw`bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5`}>
                <View style={tw`flex-row items-center`}><Icon name="cloud-check" size={22} color={tw.color('blue-600')} /><Text style={tw`text-blue-900 font-black ml-2`}>Terhubung ke Backend</Text></View>
                <Text style={tw`text-blue-600 text-xs mt-2`}>Data usaha tersimpan aman dan tersinkron otomatis.</Text>
            </View>

            <View style={tw`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-4`}>
                <Text style={tw`font-black text-gray-900 dark:text-white mb-3`}>Profil Usaha</Text>
                <TextInput editable={isManager} value={form.storeName || ''} onChangeText={value => update('storeName', value)} placeholder="Nama usaha" style={tw`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />
                <TextInput editable={isManager} value={form.storeAddress || ''} onChangeText={value => update('storeAddress', value)} placeholder="Alamat" style={tw`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 mb-3 text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />
                <TextInput editable={isManager} value={form.storePhone || ''} onChangeText={value => update('storePhone', value)} placeholder="Telepon" keyboardType="phone-pad" style={tw`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />
            </View>

            {isManager && <View style={tw`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-4`}>
                <Text style={tw`font-black text-gray-900 dark:text-white mb-3`}>Operasional</Text>
                {[
                    ['enableShift', 'Wajib buka shift'],
                    ['enablePreOrder', 'Aktifkan pre-order'],
                    ['showImages', 'Tampilkan gambar produk'],
                    ['allowNegativeStock', 'Izinkan stok minus'],
                ].map(([key, label]) => <View key={key} style={tw`flex-row items-center py-3 border-b border-gray-100 dark:border-gray-700`}><Text style={tw`flex-1 text-gray-700 dark:text-gray-200 font-bold`}>{label}</Text><Switch value={Boolean(form[key])} onValueChange={value => update(key, value)} /></View>)}
                <TextInput value={form.receiptFooter || ''} onChangeText={value => update('receiptFooter', value)} placeholder="Catatan kaki struk" style={tw`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 mt-3 text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />
            </View>}

            <View style={tw`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-5`}>
                <Text style={tw`font-black text-gray-900 dark:text-white mb-3`}>Perangkat</Text>
                <View style={tw`flex-row items-center py-2`}><Text style={tw`flex-1 text-gray-700 dark:text-gray-200 font-bold`}>Tema gelap</Text><Switch value={form.theme === 'dark'} onValueChange={value => update('theme', value ? 'dark' : 'light')} /></View>
                <View style={tw`flex-row items-center py-2`}><Text style={tw`flex-1 text-gray-700 dark:text-gray-200 font-bold`}>Logo pada struk</Text><Switch value={Boolean(form.showLogoOnReceipt)} onValueChange={value => update('showLogoOnReceipt', value)} /></View>
            </View>

            <TouchableOpacity disabled={saving} onPress={save} style={tw`bg-gray-900 rounded-2xl py-4 items-center`}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={tw`text-white font-black text-base`}>Simpan Pengaturan</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}
