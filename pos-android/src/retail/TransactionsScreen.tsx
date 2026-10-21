import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Button, Card, DateFilter, Empty, Field, Title, tw } from './ui';
import api, { showApiError } from '../services/api';
import { useStore } from '../store/useStore';
import {
  dateTime,
  isOwner,
  jakartaDate,
  paymentLabel,
  receiptFromTransaction,
  rupiah,
} from './policy';
import { validatedDates } from './data';

export default function TransactionsScreen({ navigation }: any) {
  const user = useStore(s => s.user);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [start, setStart] = useState(jakartaDate().slice(0, 8) + '01');
  const [end, setEnd] = useState(jakartaDate());
  const [query, setQuery] = useState<any>({
    page: 1,
    startDate: start,
    endDate: end,
    search: '',
  });
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const request = useRef(0);
  const detailLock = useRef(false);
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    try {
      const response = await api.get('/transactions', {
        params: { ...query, limit: 25 },
      });
      if (id === request.current) {
        setItems(response.data.data || []);
        setPages(Math.max(1, Number(response.data.meta?.totalPages || 1)));
      }
    } catch (error) {
      if (id === request.current)
        showApiError('Transaksi Belum Dimuat', error, 'Periksa koneksi.');
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [query]);
  useEffect(() => {
    load();
    return navigation.addListener('focus', load);
  }, [load, navigation]);
  const apply = () => {
    try {
      setQuery({
        page: 1,
        search: search.trim(),
        ...validatedDates(start, end),
      });
    } catch (error: any) {
      Alert.alert('Tanggal Tidak Valid', error.message);
    }
  };
  const detail = async (item: any) => {
    if (detailLock.current) return;
    detailLock.current = true;
    setDetailId(item.id);
    try {
      const response = await api.get(`/transactions/${item.id}`);
      if (!response.data?.data) throw new Error('Detail belum tersedia.');
      navigation.navigate('ReceiptPreview', {
        receiptData: receiptFromTransaction(response.data.data),
        autoPrint: false,
      });
    } catch (error) {
      showApiError('Detail Belum Dimuat', error, 'Coba lagi.');
    } finally {
      setDetailId(null);
      detailLock.current = false;
    }
  };
  const returnTransaction = (item: any) =>
    Alert.alert(
      'Retur Transaksi',
      `Retur seluruh transaksi ${item.invoiceNumber}? Stok dan poin akan dikembalikan oleh server.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Retur',
          style: 'destructive',
          onPress: async () => {
            if (!isOwner(useStore.getState().user)) return;
            try {
              await api.post(`/transactions/${item.id}/return`, {});
              await load();
            } catch (error) {
              showApiError('Retur Belum Berhasil', error, 'Coba lagi.');
            }
          },
        },
      ],
    );
  return (
    <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
      <Title title="Transaksi" navigation={navigation} />
      <FlatList
        data={items}
        keyExtractor={item => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        contentContainerStyle={tw`p-4 pb-12`}
        ListHeaderComponent={
          <Card>
            <Field
              label="Cari Invoice / Member..."
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={apply}
            />
            <DateFilter
              start={start}
              end={end}
              setStart={setStart}
              setEnd={setEnd}
              onApply={apply}
            />
          </Card>
        }
        ListEmptyComponent={<Empty loading={loading} />}
        renderItem={({ item }) => (
          <Card>
            <Text style={tw`font-bold text-gray-900 dark:text-white`}>
              {item.invoiceNumber}
            </Text>
            <Text style={tw`text-xs text-gray-500 mt-1`}>
              {dateTime(item.createdAt)}
            </Text>
            <Text style={tw`text-gray-700 dark:text-gray-300 mt-2`}>
              Member:{' '}
              {item.customer?.name ||
                (item.customerId ? item.customerName : 'Umum')}
            </Text>
            <Text style={tw`text-blue-600 text-lg font-bold mt-2`}>
              {rupiah(item.grandTotal)}
            </Text>
            <Text style={tw`text-xs text-gray-500 mt-1`}>
              {paymentLabel(item.payments?.[0]?.paymentType)} · {item.status}
            </Text>
            <Button
              title={
                detailId === item.id
                  ? 'Memuat detail...'
                  : 'Detail / Cetak Ulang'
              }
              disabled={detailId !== null}
              secondary
              onPress={() => detail(item)}
            />
            {detailId === item.id && (
              <ActivityIndicator color={tw.color('blue-600')} />
            )}
            {isOwner(user) && ['PAID', 'COMPLETED'].includes(item.status) && (
              <Button
                title="Retur"
                secondary
                onPress={() => returnTransaction(item)}
              />
            )}
          </Card>
        )}
        ListFooterComponent={
          <View style={tw`mt-4`}>
            <Text style={tw`text-center text-gray-500 mb-3`}>
              Halaman {query.page} / {pages}
            </Text>
            <Button
              title="Sebelumnya"
              secondary
              disabled={loading || query.page <= 1}
              onPress={() => setQuery({ ...query, page: query.page - 1 })}
            />
            <Button
              title="Berikutnya"
              secondary
              disabled={loading || query.page >= pages}
              onPress={() => setQuery({ ...query, page: query.page + 1 })}
            />
          </View>
        }
      />
    </View>
  );
}
