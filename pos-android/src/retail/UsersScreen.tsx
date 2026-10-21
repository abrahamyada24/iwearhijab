import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  Switch,
  Text,
  View,
} from 'react-native';
import { Button, Card, Chips, Empty, Field, Sheet, Title, tw } from './ui';
import { useStore } from '../store/useStore';
import api, { showApiError } from '../services/api';
import { isManager, isOwner } from './policy';
export default function UsersScreen({ navigation }: any) {
  const currentUser = useStore(s => s.user);
  const manager = isManager(currentUser);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!manager) return;
    setLoading(true);
    try {
      const response = await api.get('/users');
      setItems(response.data.data || []);
    } catch (error) {
      showApiError('Pengguna Belum Dimuat', error, 'Coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [manager]);
  useEffect(() => {
    load();
    return navigation.addListener('focus', load);
  }, [load, navigation]);
  const edit = (item?: any) => {
    setEditing(item || null);
    setForm({
      name: '',
      email: '',
      username: '',
      role: 'CASHIER',
      isActive: true,
      ...item,
      password: '',
      currentPassword: '',
    });
    setOpen(true);
  };
  const save = async () => {
    if (!isManager(useStore.getState().user) || busy) return;
    if (
      !form.name?.trim() ||
      !form.email?.trim() ||
      (!editing && !form.password) ||
      (form.password && form.password.length < 12)
    )
      return Alert.alert(
        'Data Belum Lengkap',
        'Isi nama, email, dan password baru minimal 12 karakter (huruf besar/kecil dan angka).',
      );
    setBusy(true);
    try {
      const payload = new FormData();
      for (const key of ['name', 'email', 'username', 'role', 'isActive'])
        payload.append(key, String(form[key] ?? ''));
      if (form.password) payload.append('password', form.password);
      if (form.currentPassword)
        payload.append('currentPassword', form.currentPassword);
      if (editing)
        await api.put(`/users/${editing.id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      else
        await api.post('/auth/register', payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      setOpen(false);
      await load();
    } catch (error) {
      showApiError('Gagal Menyimpan Pengguna', error, 'Periksa isian.');
    } finally {
      setBusy(false);
    }
  };
  if (!manager) return <Empty text="Akses khusus Admin/Owner." />;
  return (
    <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
      <Title title="Pengguna" navigation={navigation}>
        <Button title="Tambah Pengguna" onPress={() => edit()} />
      </Title>
      <FlatList
        data={items}
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
            <Text style={tw`text-gray-500 text-xs mt-2`}>
              {item.username || item.email} ·{' '}
              {item.role === 'CASHIER' ? 'Staff' : item.role} ·{' '}
              {item.isActive ? 'Aktif' : 'Nonaktif'}
            </Text>
            {(item.role !== 'OWNER' || isOwner(currentUser)) && (
              <Button
                title="Edit / Reset Password"
                secondary
                onPress={() => edit(item)}
              />
            )}
            {item.id !== currentUser?.id && item.role !== 'OWNER' && (
              <Button
                title="Hapus Akses"
                secondary
                onPress={() =>
                  Alert.alert('Hapus Akses', `Cabut akses ${item.name}?`, [
                    { text: 'Batal', style: 'cancel' },
                    {
                      text: 'Hapus',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await api.delete(`/users/${item.id}`);
                          await load();
                        } catch (error) {
                          showApiError('Gagal Menghapus', error, 'Coba lagi.');
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
        title={editing ? 'Edit Pengguna' : 'Tambah Pengguna'}
        onClose={() => setOpen(false)}
        busy={busy}
      >
        {[
          ['name', 'Nama'],
          ['email', 'Email'],
          ['username', 'Username'],
          ['password', editing ? 'Password baru (opsional)' : 'Password'],
          ...(editing?.id === currentUser?.id
            ? [['currentPassword', 'Password saat ini']]
            : []),
        ].map(([key, title]) => (
          <Field
            key={key}
            label={title}
            value={String(form[key] || '')}
            secureTextEntry={key.toLowerCase().includes('password')}
            autoCapitalize="none"
            onChangeText={(value: string) =>
              setForm((current: any) => ({ ...current, [key]: value }))
            }
          />
        ))}
        <Chips
          options={[
            { value: 'CASHIER', label: 'Staff' },
            { value: 'ADMIN', label: 'Admin' },
            ...(editing?.role === 'OWNER' && isOwner(currentUser)
              ? [{ value: 'OWNER', label: 'Owner' }]
              : []),
          ]}
          value={form.role}
          onChange={(value: string) =>
            setForm((current: any) => ({ ...current, role: value }))
          }
        />
        <View style={tw`flex-row justify-between items-center`}>
          <Text style={tw`text-gray-700 dark:text-gray-200`}>Aktif</Text>
          <Switch
            value={Boolean(form.isActive)}
            onValueChange={value =>
              setForm((current: any) => ({ ...current, isActive: value }))
            }
          />
        </View>
        <Button
          title={busy ? 'Menyimpan...' : 'Simpan'}
          disabled={busy}
          onPress={save}
        />
      </Sheet>
    </View>
  );
}
