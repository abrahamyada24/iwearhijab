import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  NativeModules,
  ScrollView,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ViewShot from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { saveDocuments } from '@react-native-documents/picker';
import { Button, Title, tw } from './ui';
import { useStore } from '../store/useStore';
import { connectConfiguredPrinter } from '../utils/printerConnection';
import { resolveApiAssetUrl } from '../services/api';
import { dateTime, paymentLabel, rupiah } from './policy';

export default function ReceiptScreen({ route, navigation }: any) {
  const data = route.params.receiptData;
  const settings = useStore(s => s.settings);
  const user = useStore(s => s.user);
  const shot = useRef<any>(null);
  const printing = useRef(false);
  const automatic = useRef(false);
  const [busy, setBusy] = useState(false);
  const [height, setHeight] = useState(0);
  const logo = settings.showLogoOnReceipt
    ? resolveApiAssetUrl(settings.storeLogo)
    : null;
  const [logoReady, setLogoReady] = useState(!logo);
  useEffect(() => {
    setLogoReady(!logo);
  }, [logo]);
  const invoiceKey = `@iwear_printed:${user?.activeStoreId}:${data.invoiceNumber}`;
  const text = { fontFamily: 'sans-serif', fontSize: 12, color: '#000000' };
  const row = (label: string, value: string, bold = false) => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 7,
      }}
    >
      <Text style={[text, { flex: 1, fontWeight: bold ? '700' : '400' }]}>
        {label}
      </Text>
      <Text style={[text, { fontWeight: bold ? '700' : '400' }]}>{value}</Text>
    </View>
  );
  const print = async (auto = false) => {
    if (printing.current) return;
    if (!settings.printerAddress) {
      if (auto)
        Alert.alert(
          'Struk Siap',
          'Pilih printer pada Pengaturan untuk mencetak. Struk tetap dapat diunduh atau dibagikan.',
        );
      return;
    }
    printing.current = true;
    setBusy(true);
    try {
      const printer = await connectConfiguredPrinter(settings);
      const uri = await shot.current.capture();
      const base64 = await RNFS.readFile(uri.replace('file://', ''), 'base64');
      await printer.printImageBase64(base64, {
        imageWidth: 384,
        imageHeight: Math.round((height * 384) / 300),
        printerWidthType: 58,
        tailingLine: true,
      });
      // Claim the first successful submission before sending the pulse. Reprints,
      // exact cash, non-cash payments and resumed previews never open the drawer.
      if (
        auto &&
        data.paymentMethod === 'CASH' &&
        Number(data.changeAmount) > 0 &&
        !(await AsyncStorage.getItem(invoiceKey + ':drawer'))
      ) {
        await AsyncStorage.setItem(invoiceKey + ':drawer', 'sent');
        await printer.printRaw('G3AAGfo=');
      }
    } catch (error: any) {
      Alert.alert(
        'Cetak Belum Berhasil',
        error.message || 'Periksa printer lalu cetak ulang.',
      );
    } finally {
      printing.current = false;
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!route.params.autoPrint || !height || !logoReady || automatic.current)
      return;
    automatic.current = true;
    (async () => {
      if (await AsyncStorage.getItem(invoiceKey)) return;
      await AsyncStorage.setItem(invoiceKey, 'started');
      await print(true);
    })().catch(() =>
      Alert.alert(
        'Cetak Otomatis Belum Berhasil',
        'Gunakan tombol Cetak Ulang.',
      ),
    );
  }, [height, logoReady]);
  const download = async () => {
    setBusy(true);
    try {
      const uri = await shot.current.capture();
      const result = await saveDocuments({
        sourceUris: [uri],
        fileName: `Struk-${String(data.invoiceNumber).replace(
          /[^a-zA-Z0-9-]/g,
          '_',
        )}.png`,
        mimeType: 'image/png',
      });
      if (result[0]?.error) throw new Error(result[0].error);
    } catch (error: any) {
      if (!String(error.code).includes('CANCEL'))
        Alert.alert('Unduh Belum Berhasil', error.message);
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    setBusy(true);
    try {
      const uri = await shot.current.capture();
      const message = `Struk ${settings.storeName}\n${
        data.invoiceNumber
      }\n${dateTime(data.createdAt)}\nTotal ${rupiah(data.total)}`;
      const phone = String(data.customerPhone || '')
        .replace(/[^0-9]/g, '')
        .replace(/^0/, '62');
      if (NativeModules.WhatsAppReceiptShare?.share)
        await NativeModules.WhatsAppReceiptShare.share(
          uri,
          message,
          phone.length >= 9 ? phone : null,
        );
      else
        await Share.open({
          url: uri,
          type: 'image/png',
          message,
          failOnCancel: false,
        });
    } catch (error: any) {
      if (!/cancel|did not share/i.test(error.message || ''))
        Alert.alert('Bagikan Belum Berhasil', error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={tw`flex-1 bg-gray-100 dark:bg-gray-950`}>
      <Title title="Struk Transaksi" navigation={navigation} />
      <ScrollView contentContainerStyle={tw`items-center p-4 pb-12`}>
        <ViewShot
          ref={shot}
          options={{ format: 'png', quality: 1, width: 384 }}
        >
          <View
            collapsable={false}
            onLayout={event => setHeight(event.nativeEvent.layout.height)}
            style={{ width: 300, padding: 16, backgroundColor: '#ffffff' }}
          >
            {logo && (
              <Image
                source={{ uri: logo }}
                resizeMode="contain"
                style={{
                  width: 150,
                  height: 65,
                  alignSelf: 'center',
                  marginBottom: 10,
                }}
                onLoadEnd={() => setLogoReady(true)}
              />
            )}
            <Text
              style={[
                text,
                { textAlign: 'center', fontSize: 16, fontWeight: '700' },
              ]}
            >
              {settings.storeName}
            </Text>
            {settings.storeAddress ? (
              <Text style={[text, { textAlign: 'center', marginTop: 4 }]}>
                {settings.storeAddress}
              </Text>
            ) : null}
            {settings.storePhone ? (
              <Text style={[text, { textAlign: 'center', marginTop: 4 }]}>
                {settings.storePhone}
              </Text>
            ) : null}
            <View
              style={{
                borderTopWidth: 1,
                borderStyle: 'dashed',
                marginVertical: 12,
              }}
            />
            <Text style={text}>{data.invoiceNumber}</Text>
            <Text style={text}>{dateTime(data.createdAt)}</Text>
            <Text style={text}>Kasir: {data.user?.name || user?.name}</Text>
            {data.customerId ? (
              <Text style={text}>Member: {data.customerName}</Text>
            ) : null}
            <Text style={text}>Status: {data.paymentStatus}</Text>
            <View
              style={{
                borderTopWidth: 1,
                borderStyle: 'dashed',
                marginVertical: 12,
              }}
            />
            {(data.items || []).map((item: any, index: number) => (
              <View key={index} style={{ marginBottom: 10 }}>
                <Text style={[text, { fontWeight: '700' }]}>{item.name}</Text>
                {row(
                  `${item.quantity} × ${rupiah(item.price)}`,
                  rupiah(item.quantity * item.price),
                )}
                {Number(item.loyaltyRewardQty) > 0 && (
                  <Text style={text}>
                    {item.loyaltyRewardQty} produk gratis (Tukar Point)
                  </Text>
                )}
                {item.notes && <Text style={text}>{item.notes}</Text>}
              </View>
            ))}
            <View
              style={{
                borderTopWidth: 1,
                borderStyle: 'dashed',
                marginVertical: 8,
              }}
            />
            {row('Subtotal', rupiah(data.subtotal))}
            {Number(data.discountAmount) > 0 &&
              row('Diskon / Tukar Point', '−' + rupiah(data.discountAmount))}
            {Number(data.taxAmount) > 0 && row('Pajak', rupiah(data.taxAmount))}
            {row('TOTAL', rupiah(data.total), true)}
            {row(
              `Bayar (${paymentLabel(data.paymentMethod)})`,
              rupiah(data.cashAmount),
            )}
            {Number(data.changeAmount) > 0 &&
              row('Kembali', rupiah(data.changeAmount))}
            {data.customerId && data.pointsBalanceAfter != null && (
              <>
                {row('Poin didapat', '+' + Number(data.pointsEarned || 0))}
                {Number(data.pointsRedeemed) > 0 &&
                  row('Poin ditukar', '−' + data.pointsRedeemed)}
                {row('Saldo poin', String(data.pointsBalanceAfter), true)}
              </>
            )}
            <View
              style={{
                borderTopWidth: 1,
                borderStyle: 'dashed',
                marginVertical: 12,
              }}
            />
            <Text style={[text, { textAlign: 'center' }]}>
              {settings.receiptFooter || 'Terima kasih atas kunjungan Anda'}
            </Text>
          </View>
        </ViewShot>
        <View style={{ width: '100%', maxWidth: 360, marginTop: 20 }}>
          <Button
            title={busy ? 'Memproses...' : 'Cetak Ulang'}
            disabled={busy || !height || !logoReady}
            onPress={() => print(false)}
          />
          <Button
            title="Unduh PNG"
            secondary
            disabled={busy || !height || !logoReady}
            onPress={download}
          />
          <Button
            title="Bagikan Struk"
            secondary
            disabled={busy || !height || !logoReady}
            onPress={share}
          />
          <Button
            title="Selesai"
            secondary
            disabled={busy}
            onPress={() => navigation.navigate('Main')}
          />
        </View>
      </ScrollView>
    </View>
  );
}
