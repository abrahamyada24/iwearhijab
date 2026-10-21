import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import {
  Button,
  Card,
  Chips,
  DateFilter,
  Empty,
  Field,
  Sheet,
  Title,
  tw,
} from './ui';
import api, { showApiError } from '../services/api';
import {
  dateTime,
  expenseCategories,
  isManager,
  jakartaDate,
  rupiah,
} from './policy';
import { validatedDates } from './data';
import { useStore } from '../store/useStore';

export default function ExpensesScreen({ navigation }: any) {
  const manager = isManager(useStore(s => s.user));
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [start, setStart] = useState(jakartaDate().slice(0, 8) + '01');
  const [end, setEnd] = useState(jakartaDate());
  const [filter, setFilter] = useState('');
  const [query, setQuery] = useState<any>({ startDate: start, endDate: end });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Umum');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!manager) return;
    setLoading(true);
    try {
      const response = await api.get('/expenses', { params: query });
      setItems(response.data.data || []);
      setTotal(Number(response.data.total));
    } catch (error) {
      showApiError('Pengeluaran Belum Dimuat', error, 'Periksa koneksi.');
    } finally {
      setLoading(false);
    }
  }, [query, manager]);
  useEffect(() => {
    load();
    return navigation.addListener('focus', load);
  }, [load, navigation]);
  const apply = () => {
    try {
      setQuery({
        ...validatedDates(start, end),
        ...(filter ? { category: filter } : {}),
      });
    } catch (error: any) {
      Alert.alert('Tanggal Tidak Valid', error.message);
    }
  };
  const save = async () => {
    if (!isManager(useStore.getState().user) || busy) return;
    if (!description.trim() || Number(amount) <= 0)
      return Alert.alert(
        'Data Belum Lengkap',
        'Isi keterangan dan nominal lebih dari nol.',
      );
    setBusy(true);
    try {
      await api.post('/expenses', {
        description: description.trim(),
        amount: Number(amount),
        category,
      });
      setOpen(false);
      await load();
    } catch (error) {
      showApiError('Gagal Menyimpan', error, 'Pengeluaran belum tersimpan.');
    } finally {
      setBusy(false);
    }
  };
  if (!manager) return <Empty text="Akses khusus Admin/Owner." />;
  return (
    <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
      <Title
        title="Pengeluaran"
        subtitle="Pencatatan pengeluaran perusahaan"
        navigation={navigation}
      />
      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={tw`p-4 pb-12`}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        ListHeaderComponent={
          <>
            <Card>
              <DateFilter
                start={start}
                end={end}
                setStart={setStart}
                setEnd={setEnd}
                onApply={apply}
              />
              <Chips
                options={[
                  { value: '', label: 'Semua Kategori' },
                  ...expenseCategories,
                ]}
                value={filter}
                onChange={(value: string) => {
                  setFilter(value);
                  try {
                    setQuery({
                      ...validatedDates(start, end),
                      ...(value ? { category: value } : {}),
                    });
                  } catch (error: any) {
                    Alert.alert('Tanggal Tidak Valid', error.message);
                  }
                }}
              />
            </Card>
            <Card>
              <Text style={tw`text-gray-500`}>Total</Text>
              <Text style={tw`text-3xl font-bold text-blue-600`}>
                {rupiah(total)}
              </Text>
            </Card>
            <Button
              title="Tambah Pengeluaran"
              onPress={() => {
                setDescription('');
                setAmount('');
                setCategory('Umum');
                setOpen(true);
              }}
            />
          </>
        }
        ListEmptyComponent={<Empty loading={loading} />}
        renderItem={({ item }) => (
          <Card>
            <Text style={tw`font-bold text-gray-900 dark:text-white`}>
              {item.description}
            </Text>
            <Text style={tw`text-xs text-gray-500 mt-1`}>
              {item.category} · {dateTime(item.createdAt)}
            </Text>
            <Text style={tw`font-bold text-red-500 mt-2`}>
              {rupiah(item.amount)}
            </Text>
            <Button
              title="Hapus"
              secondary
              onPress={() =>
                Alert.alert('Hapus Pengeluaran', item.description, [
                  { text: 'Batal', style: 'cancel' },
                  {
                    text: 'Hapus',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await api.delete(`/expenses/${item.id}`);
                        await load();
                      } catch (error) {
                        showApiError('Gagal Menghapus', error, 'Coba lagi.');
                      }
                    },
                  },
                ])
              }
            />
          </Card>
        )}
      />
      <Sheet
        visible={open}
        title="Tambah Pengeluaran"
        onClose={() => setOpen(false)}
        busy={busy}
      >
        <Field
          label="Keterangan"
          value={description}
          onChangeText={setDescription}
        />
        <Field
          label="Nominal"
          value={amount}
          onChangeText={(value: string) =>
            setAmount(value.replace(/[^0-9]/g, ''))
          }
          keyboardType="numeric"
        />
        <Chips
          options={expenseCategories}
          value={category}
          onChange={setCategory}
        />
        <Button
          title={busy ? 'Menyimpan...' : 'Simpan'}
          disabled={busy}
          onPress={save}
        />
      </Sheet>
    </View>
  );
}
