import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Button, Card, Chips, DateFilter, Empty, Title, tw } from './ui';
import api, { showApiError } from '../services/api';
import {
  dateTime,
  isManager,
  jakartaDate,
  paymentLabel,
  rupiah,
  receiptFromTransaction,
} from './policy';
import { useStore } from '../store/useStore';
import { validatedDates } from './data';
import { csv, saveExport, savePdf } from './exportFile';

export default function ReportsScreen({ navigation }: any) {
  const manager = isManager(useStore(s => s.user));
  const [start, setStart] = useState(jakartaDate().slice(0, 8) + '01');
  const [end, setEnd] = useState(jakartaDate());
  const [range, setRange] = useState({ startDate: start, endDate: end });
  const [tab, setTab] = useState('profit-loss');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const request = useRef(0);
  const detailLock = useRef(false);
  const load = useCallback(async () => {
    if (!manager) return;
    const id = ++request.current;
    setLoading(true);
    setData(null);
    try {
      const response = await api.get(`/reports/${tab}`, { params: range });
      if (id === request.current) setData(response.data.data);
    } catch (error) {
      if (id === request.current)
        showApiError('Laporan Belum Dimuat', error, 'Periksa koneksi.');
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [manager, tab, range]);
  useEffect(() => {
    load();
    return navigation.addListener('focus', load);
  }, [load, navigation]);
  const apply = () => {
    try {
      setRange(validatedDates(start, end));
    } catch (error: any) {
      Alert.alert('Tanggal Tidak Valid', error.message);
    }
  };
  const exportReport = async (pdf: boolean) => {
    setExporting(true);
    try {
      let rows: any[][];
      if (tab === 'by-category')
        rows = [
          ['Kategori', 'Qty', 'Penjualan', 'Laba Kotor'],
          ...(data || []).map((item: any) => [
            item.name,
            item.totalQty,
            item.totalRevenue,
            item.totalProfit,
          ]),
        ];
      else if (tab === 'by-customer')
        rows = [
          ['Member', 'Telepon', 'Transaksi', 'Total Belanja'],
          ...(data || []).map((item: any) => [
            item.name,
            item.phone,
            item.visitCount,
            item.totalSpent,
          ]),
        ];
      else if (tab === 'export')
        rows = [
          ['Invoice', 'Tanggal', 'Member', 'Total', 'Metode', 'Status'],
          ...(data || []).map((item: any) => [
            item.invoiceNumber,
            dateTime(item.createdAt),
            item.customer?.name ||
              (item.customerId ? item.customerName : 'Umum'),
            item.grandTotal,
            paymentLabel(item.payments?.[0]?.paymentType),
            item.status,
          ]),
        ];
      else if (tab === 'shift')
        rows = [
          ['Shift', 'Dibuka', 'Ditutup', 'Status', 'Kas Awal', 'Kas Akhir'],
          ...(data || []).map((item: any) => [
            item.id,
            item.openedAt,
            item.closedAt,
            item.status,
            item.openingCash,
            item.closingCash,
          ]),
        ];
      else
        rows = [
          ['Keterangan', 'Nilai'],
          ...[
            ['Penjualan', data?.netRevenue],
            ['HPP', data?.cogs],
            ['Laba Kotor', data?.grossProfit],
            ['Pengeluaran', data?.totalExpenses],
            ['Laba Bersih', data?.netProfit],
          ],
        ];
      const name = `Laporan-${tab === 'by-customer' ? 'Member' : tab}-${
        range.startDate
      }-${range.endDate}`;
      if (pdf)
        await savePdf(name + '.pdf', [
          'IWEARING HIJAB',
          `${range.startDate} s/d ${range.endDate}`,
          ...rows.map(row => row.join(' | ')),
        ]);
      else await saveExport(name + '.csv', csv(rows));
    } catch (error: any) {
      if (!String(error.code || '').includes('CANCEL'))
        showApiError('Ekspor Belum Berhasil', error, 'Coba lagi.');
    } finally {
      setExporting(false);
    }
  };
  if (!manager) return <Empty text="Akses khusus Admin/Owner." />;
  return (
    <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
      <Title title="Laporan" navigation={navigation} />
      <ScrollView
        contentContainerStyle={tw`p-4 pb-12`}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
      >
        <Card>
          {tab !== 'shift' ? (
            <DateFilter
              start={start}
              end={end}
              setStart={setStart}
              setEnd={setEnd}
              onApply={apply}
            />
          ) : (
            <Text style={tw`text-xs text-gray-500 mb-2`}>20 shift terbaru</Text>
          )}
          <Chips
            options={[
              { value: 'profit-loss', label: 'Laba Rugi' },
              { value: 'export', label: 'Transaksi' },
              { value: 'by-category', label: 'Kategori' },
              { value: 'by-customer', label: 'Member' },
              { value: 'shift', label: 'Shift' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </Card>
        {loading ? (
          <Empty loading />
        ) : !data ? (
          <Empty text="Laporan belum tersedia." />
        ) : (
          <>
            {tab === 'profit-loss' ? (
              <Card>
                {[
                  ['Penjualan', data.netRevenue],
                  ['HPP', data.cogs],
                  ['Laba Kotor', data.grossProfit],
                  ['Pengeluaran', data.totalExpenses],
                  ['Laba Bersih', data.netProfit],
                ].map(([label, value]) => (
                  <View
                    key={String(label)}
                    style={tw`flex-row justify-between py-3 border-b border-gray-100 dark:border-gray-700`}
                  >
                    <Text style={tw`text-gray-600 dark:text-gray-300`}>
                      {label}
                    </Text>
                    <Text style={tw`font-bold text-blue-600`}>
                      {rupiah(value)}
                    </Text>
                  </View>
                ))}
              </Card>
            ) : (
              (data || []).map((item: any, index: number) => (
                <Card key={item.id || index}>
                  <Text style={tw`font-bold text-gray-900 dark:text-white`}>
                    {item.name || item.invoiceNumber || item.id}
                  </Text>
                  {tab === 'by-category' && (
                    <>
                      <Text style={tw`text-blue-600 mt-2`}>
                        {item.totalQty} item · {rupiah(item.totalRevenue)}
                      </Text>
                      <Text style={tw`text-gray-500 mt-1`}>
                        Laba kotor: {rupiah(item.totalProfit)}
                      </Text>
                    </>
                  )}
                  {tab === 'by-customer' && (
                    <Text style={tw`text-blue-600 mt-2`}>
                      {item.visitCount} transaksi · {rupiah(item.totalSpent)}
                    </Text>
                  )}
                  {tab === 'export' && (
                    <>
                      <Text style={tw`text-gray-500 text-xs mt-2`}>
                        {dateTime(item.createdAt)} · Member:{' '}
                        {item.customer?.name ||
                          (item.customerId ? item.customerName : 'Umum')}
                      </Text>
                      <Text style={tw`text-blue-600 mt-2`}>
                        {rupiah(item.grandTotal)} ·{' '}
                        {paymentLabel(item.payments?.[0]?.paymentType)}
                      </Text>
                      <Button
                        title={
                          detailId === item.id
                            ? 'Memuat detail...'
                            : 'Detail / Struk'
                        }
                        disabled={detailId !== null}
                        secondary
                        onPress={async () => {
                          if (detailLock.current) return;
                          detailLock.current = true;
                          setDetailId(item.id);
                          try {
                            const response = await api.get(
                              `/transactions/${item.id}`,
                            );
                            navigation.navigate('ReceiptPreview', {
                              receiptData: receiptFromTransaction(
                                response.data.data,
                              ),
                              autoPrint: false,
                            });
                          } catch (error) {
                            showApiError(
                              'Detail Belum Dimuat',
                              error,
                              'Coba lagi.',
                            );
                          } finally {
                            detailLock.current = false;
                            setDetailId(null);
                          }
                        }}
                      />
                    </>
                  )}
                  {tab === 'shift' && (
                    <Text style={tw`text-gray-500 mt-2`}>
                      {dateTime(item.openedAt)} · {item.status}
                    </Text>
                  )}
                </Card>
              ))
            )}
            <Button
              title={exporting ? 'Memproses...' : 'Ekspor CSV'}
              disabled={exporting}
              onPress={() => exportReport(false)}
            />
            <Button
              title="Ekspor PDF"
              secondary
              disabled={exporting}
              onPress={() => exportReport(true)}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}
