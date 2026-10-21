import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Button, Card, Field, Title, tw } from './ui';
import { useStore } from '../store/useStore';
import api, { showApiError } from '../services/api';
import { bootstrapRetail } from './data';
import { dateTime, isManager, receiptFromTransaction, rupiah } from './policy';
import { getPendingCheckout, sendCheckout } from './checkoutRequest';

export default function HomeScreen({ navigation }: any) {
  const user = useStore(s => s.user);
  const settings = useStore(s => s.settings);
  const shift = useStore(s => s.activeShift);
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cash, setCash] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const manager = isManager(user);
  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setPending(Boolean(await getPendingCheckout(useStore.getState().user)));
      const response = await api.get('/reports/dashboard', {
        params: { period: manager ? 'month' : 'today' },
      });
      setData(response.data.data);
    } catch (error) {
      showApiError(
        'Gagal Memuat Dashboard',
        error,
        'Tarik untuk mencoba lagi.',
      );
    } finally {
      setRefreshing(false);
    }
  }, [manager]);
  useEffect(() => {
    load();
    return navigation.addListener('focus', load);
  }, [load, navigation]);
  const updateShift = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = shift
        ? await api.post(`/shifts/${encodeURIComponent(shift.id)}/close`, {
            closingCash: Number(cash || 0),
          })
        : await api.post('/shifts/open', { openingCash: Number(cash || 0) });
      if (!response.data.success) throw new Error(response.data.message);
      setCash('');
      await bootstrapRetail();
      await load();
      Alert.alert(
        shift ? 'Shift Ditutup' : 'Shift Dibuka',
        'Data shift tersimpan di server.',
      );
    } catch (error) {
      showApiError(
        'Shift Belum Diperbarui',
        error,
        'Periksa koneksi dan coba lagi.',
      );
    } finally {
      setBusy(false);
    }
  };
  const breakdown = data?.todayPaymentBreakdown || {};
  const summary = data?.summary || {};
  const split = (title: string, counts: boolean) => (
    <Card>
      <Text style={tw`font-bold text-gray-900 dark:text-white mb-3`}>
        {title}
      </Text>
      <View style={tw`flex-row`}>
        <View style={tw`flex-1 mr-2`}>
          <Text style={{ color: '#059669', fontWeight: '700' }}>CASH</Text>
          <Text
            style={tw`text-lg font-bold text-gray-900 dark:text-white mt-2`}
          >
            {counts ? Number(breakdown.cashCount || 0) : rupiah(breakdown.cash)}
          </Text>
        </View>
        <View style={tw`flex-1`}>
          <Text style={{ color: '#2563eb', fontWeight: '700' }}>QRIS</Text>
          <Text
            style={tw`text-lg font-bold text-gray-900 dark:text-white mt-2`}
          >
            {counts ? Number(breakdown.qrisCount || 0) : rupiah(breakdown.qris)}
          </Text>
        </View>
      </View>
    </Card>
  );
  return (
    <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
      <Title title="SISTEM KASIR" subtitle="IWEARINGHIJAB" />
      <ScrollView
        contentContainerStyle={tw`p-4 pb-12`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
      >
        <View style={tw`flex-row items-center mb-5`}>
          <Image
            source={require('../assets/brand-monogram.png')}
            style={{ width: 44, height: 44, marginRight: 12 }}
          />
          <View>
            <Text style={tw`text-lg font-bold text-gray-900 dark:text-white`}>
              Halo, {user?.name}
            </Text>
            <Text style={tw`text-xs text-gray-500`}>
              {manager ? user?.role : 'Staff'} · Hari ini (WIB)
            </Text>
          </View>
        </View>
        {split('Total Penjualan', false)}
        {split('Transaksi Selesai', true)}
        {manager && (
          <Card>
            <Text style={tw`text-gray-500`}>Bulan ini</Text>
            <Text style={tw`text-2xl font-bold text-blue-600`}>
              {rupiah(summary.totalRevenue)}
            </Text>
            <Text style={tw`text-gray-600 dark:text-gray-300 mt-2`}>
              Laba kotor: {rupiah(summary.totalProfit)}
            </Text>
            <Text style={tw`text-gray-600 dark:text-gray-300 mt-2`}>
              {summary.totalTransactions || 0} transaksi · Diskon{' '}
              {rupiah(summary.totalDiscount)}
            </Text>
            <Text style={tw`text-gray-600 dark:text-gray-300 mt-2`}>
              Pajak: {rupiah(summary.totalTax)}
            </Text>
            <Text style={tw`text-gray-600 dark:text-gray-300 mt-2`}>
              Pengeluaran: {rupiah(summary.totalExpenses)}
            </Text>
            <Text style={tw`text-blue-600 font-bold mt-2`}>
              Laba bersih: {rupiah(summary.netProfit)}
            </Text>
          </Card>
        )}
        {manager && data?.chartData?.length > 0 && (
          <Card>
            <Text style={tw`font-bold text-gray-900 dark:text-white mb-3`}>
              Tren Penjualan · 7 hari transaksi terakhir
            </Text>
            {data.chartData.slice(-7).map((day: any) => (
              <View key={day.date} style={tw`mb-3`}>
                <View style={tw`flex-row justify-between`}>
                  <Text style={tw`text-xs text-gray-500`}>{day.label}</Text>
                  <Text style={tw`text-xs text-blue-600`}>
                    {rupiah(day.revenue)}
                  </Text>
                </View>
                <View style={tw`h-2 bg-blue-50 rounded-full mt-1`}>
                  <View
                    style={[
                      tw`h-2 bg-blue-600 rounded-full`,
                      {
                        width: `${Math.max(
                          1,
                          (Number(day.revenue) /
                            Math.max(
                              1,
                              ...data.chartData.map((item: any) =>
                                Number(item.revenue),
                              ),
                            )) *
                            100,
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </Card>
        )}
        {manager && data?.topProducts?.length > 0 && (
          <Card>
            <Text style={tw`font-bold text-gray-900 dark:text-white mb-3`}>
              Produk Terlaris
            </Text>
            {data.topProducts.slice(0, 5).map((item: any) => (
              <View
                key={item.productId}
                style={tw`flex-row justify-between mb-3`}
              >
                <Text style={tw`text-gray-700 dark:text-gray-200 flex-1 mr-2`}>
                  {item.name}
                </Text>
                <Text style={tw`text-blue-600`}>
                  {item.sold} · {rupiah(item.revenue)}
                </Text>
              </View>
            ))}
          </Card>
        )}
        {settings.enableShift && (
          <Card>
            <Text style={tw`font-bold text-gray-900 dark:text-white mb-3`}>
              {shift ? 'Shift aktif' : 'Buka Shift'}
            </Text>
            {shift && (
              <Text style={tw`text-xs text-gray-500 mb-3`}>
                {dateTime(shift.openedAt)} · Kas awal{' '}
                {rupiah(shift.openingCash)}
              </Text>
            )}
            <Field
              label={shift ? 'Kas akhir di laci' : 'Kas awal di laci'}
              value={cash}
              onChangeText={(value: string) =>
                setCash(value.replace(/[^0-9]/g, ''))
              }
              keyboardType="numeric"
            />
            <Button
              title={
                busy ? 'Memproses...' : shift ? 'Tutup Shift' : 'Buka Shift'
              }
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  shift ? 'Tutup Shift' : 'Buka Shift',
                  `Kas ${shift ? 'akhir' : 'awal'}: ${rupiah(cash)}`,
                  [
                    { text: 'Batal', style: 'cancel' },
                    { text: 'Konfirmasi', onPress: updateShift },
                  ],
                )
              }
            />
          </Card>
        )}
        {pending && (
          <Card>
            <Text style={tw`text-gray-700 dark:text-gray-200 mb-2`}>
              Transaksi sebelumnya belum terkonfirmasi. Lanjutkan dengan data
              dan nomor permintaan yang sama.
            </Text>
            <Button
              title={busy ? 'Memproses...' : 'Lanjutkan Transaksi Sebelumnya'}
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  const result = await sendCheckout(useStore.getState().user);
                  useStore.getState().clearCart();
                  setPending(false);
                  navigation.navigate('ReceiptPreview', {
                    receiptData: receiptFromTransaction(
                      result.transaction,
                      result.receiptFallback,
                    ),
                    autoPrint: true,
                  });
                } catch (error) {
                  showApiError(
                    'Transaksi Belum Terkonfirmasi',
                    error,
                    'Periksa koneksi lalu coba lagi.',
                  );
                } finally {
                  setPending(
                    Boolean(await getPendingCheckout(useStore.getState().user)),
                  );
                  setBusy(false);
                }
              }}
            />
          </Card>
        )}
        <Button
          title="Buka Kasir"
          disabled={pending}
          onPress={() => navigation.navigate('POS')}
        />
        <Button
          title="Kelola Produk"
          secondary
          onPress={() => navigation.navigate('ProductList')}
        />
        <Button
          title="Member"
          secondary
          onPress={() => navigation.navigate('Member')}
        />
        <Button
          title="Transaksi"
          secondary
          onPress={() => navigation.navigate('Transaksi')}
        />
        {manager && (
          <>
            <Button
              title="Laporan"
              secondary
              onPress={() => navigation.navigate('Laporan')}
            />
            <Button
              title="Pengeluaran"
              secondary
              onPress={() => navigation.navigate('Pengeluaran')}
            />
            <Button
              title="Pengguna"
              secondary
              onPress={() => navigation.navigate('UserManagement')}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
