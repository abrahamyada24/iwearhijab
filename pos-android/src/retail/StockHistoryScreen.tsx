import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Card, Empty, Field, Title, tw } from './ui';
import api, { showApiError } from '../services/api';
import { dateTime } from './policy';
export default function StockHistoryScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/inventory/history');
      setItems(response.data.data || []);
    } catch (error) {
      showApiError('Riwayat Stok Belum Dimuat', error, 'Periksa koneksi.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    return navigation.addListener('focus', load);
  }, [load, navigation]);
  return (
    <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
      <Title title="Riwayat Stok" navigation={navigation}>
        <Field
          label="Cari produk / keterangan"
          value={search}
          onChangeText={setSearch}
        />
      </Title>
      <FlatList
        data={items.filter(item =>
          [item.product?.name, item.product?.sku, item.description]
            .join(' ')
            .toLowerCase()
            .includes(search.toLowerCase()),
        )}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={tw`p-4`}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        ListEmptyComponent={<Empty loading={loading} />}
        renderItem={({ item }) => (
          <Card>
            <Text style={tw`font-bold text-gray-900 dark:text-white`}>
              {item.product?.name}
            </Text>
            <Text style={tw`text-blue-600 mt-1`}>
              {item.type === 'IN' ? '+' : '−'}
              {item.qty} · {item.source}
            </Text>
            <Text style={tw`text-xs text-gray-500 mt-2`}>
              {dateTime(item.createdAt)} · {item.description}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}
