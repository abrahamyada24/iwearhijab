import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import { Button, Card, Empty, Field, Sheet, Title, tw } from './ui';
import api, { showApiError } from '../services/api';
import { fetchCustomers } from '../services/saasDataService';
import { useStore } from '../store/useStore';
import { isManager } from './policy';

export default function MembersScreen({ navigation }: any) {
  const manager = isManager(useStore(s => s.user));
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchCustomers());
    } catch (error) {
      showApiError('Member Belum Dimuat', error, 'Periksa koneksi.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    return navigation.addListener('focus', load);
  }, [load, navigation]);
  const edit = (item?: any) => {
    setEditing(item || null);
    setForm(
      item || {
        name: '',
        phone: '',
        email: '',
        notes: '',
        loyaltyDiscount: 0,
        points: 0,
      },
    );
    setOpen(true);
  };
  const save = async () => {
    if (busy) return;
    if (!form.name?.trim())
      return Alert.alert('Data Belum Lengkap', 'Nama member wajib diisi.');
    setBusy(true);
    try {
      const payload = new FormData();
      for (const key of ['name', 'phone', 'email', 'notes'])
        payload.append(key, String(form[key] ?? ''));
      if (manager)
        for (const key of ['loyaltyDiscount', 'points']) {
          if (!editing || Number(form[key]) !== Number(editing[key]))
            payload.append(key, String(form[key] || 0));
        }
      if (editing)
        await api.put(`/customers/${editing.id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      else
        await api.post('/customers', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      setOpen(false);
      await load();
    } catch (error) {
      showApiError('Gagal Menyimpan Member', error, 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
      <Title title="Member" navigation={navigation}>
        <Field
          label="Cari nama, ID Member, atau telepon"
          value={search}
          onChangeText={setSearch}
        />
        <Button title="Tambah Member" onPress={() => edit()} />
      </Title>
      <FlatList
        data={items.filter(item =>
          [item.name, item.memberId, item.phone, item.email]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase()),
        )}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={tw`p-4 pb-12`}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        ListEmptyComponent={<Empty loading={loading} />}
        renderItem={({ item }) => (
          <Card>
            <Text style={tw`font-bold text-gray-900 dark:text-white`}>
              {item.name}
            </Text>
            <Text style={tw`text-blue-600 mt-1`}>
              {item.memberId} · {item.points || 0} poin
            </Text>
            <Text style={tw`text-gray-500 text-xs mt-1`}>
              {item.phone} {item.email}
            </Text>
            {item.notes && (
              <Text style={tw`text-gray-500 text-xs mt-2`}>{item.notes}</Text>
            )}
            <Button title="Edit Member" secondary onPress={() => edit(item)} />
            {manager && (
              <Button
                title="Hapus Member"
                secondary
                onPress={() =>
                  Alert.alert('Hapus Member', item.name, [
                    { text: 'Batal', style: 'cancel' },
                    {
                      text: 'Hapus',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await api.delete(`/customers/${item.id}`);
                          await load();
                        } catch (error) {
                          showApiError(
                            'Gagal Menghapus',
                            error,
                            'Member masih digunakan.',
                          );
                        }
                      },
                    },
                  ])
                }
              />
            )}
          </Card>
        )}
      />
      <Sheet
        visible={open}
        title={editing ? 'Edit Member' : 'Tambah Member'}
        onClose={() => setOpen(false)}
        busy={busy}
      >
        {[
          ['name', 'Nama'],
          ['phone', 'Telepon'],
          ['email', 'Email'],
          ['notes', 'Catatan'],
        ].map(([key, title]) => (
          <Field
            key={key}
            label={title}
            value={String(form[key] || '')}
            keyboardType={
              key === 'phone'
                ? 'phone-pad'
                : key === 'email'
                ? 'email-address'
                : 'default'
            }
            autoCapitalize={key === 'email' ? 'none' : 'sentences'}
            onChangeText={(value: string) =>
              setForm((current: any) => ({ ...current, [key]: value }))
            }
          />
        ))}
        {manager &&
          [
            ['loyaltyDiscount', 'Diskon member (%)'],
            ['points', 'Saldo poin'],
          ].map(([key, title]) => (
            <Field
              key={key}
              label={title}
              keyboardType="numeric"
              value={String(form[key] ?? 0)}
              onChangeText={(value: string) =>
                setForm((current: any) => ({
                  ...current,
                  [key]: value.replace(/[^0-9]/g, ''),
                }))
              }
            />
          ))}
        <Button
          title={busy ? 'Menyimpan...' : 'Simpan'}
          disabled={busy}
          onPress={save}
        />
      </Sheet>
    </View>
  );
}
