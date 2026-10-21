import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import * as Printers from 'react-native-thermal-receipt-printer-image-qr';
import { useAppColorScheme } from 'twrnc';
import { Button, Card, Chips, Field, Title, tw } from './ui';
import { useStore } from '../store/useStore';
import api, { showApiError } from '../services/api';
import { logoutSaas, saveDeviceSettings } from '../services/saasDataService';
import { bootstrapRetail } from './data';
import { isManager } from './policy';
import { requestPrinterPermissions } from '../utils/permissions';
import { connectConfiguredPrinter } from '../utils/printerConnection';

export default function SettingsScreen({ navigation }: any) {
  const settings = useStore(s => s.settings);
  const manager = isManager(useStore(s => s.user));
  const [, , setScheme] = useAppColorScheme(tw);
  const [form, setForm] = useState<any>(settings);
  const [tab, setTab] = useState('device');
  const [printerType, setPrinterType] = useState<'BLE' | 'USB'>('BLE');
  const [devices, setDevices] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [logo, setLogo] = useState<any>(null);
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setForm(settings);
  }, [settings]);
  const update = (key: string, value: any) => {
    dirty.current = true;
    setForm((current: any) => ({ ...current, [key]: value }));
  };
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (manager && tab !== 'device' && tab !== 'printer') {
        if (tab === 'loyalty')
          await api.put('/settings/loyalty', {
            isActive: Boolean(form.loyalty_active),
            pointMultiplier: Number(form.loyalty_multiplier),
            multiplierAmount: Number(form.loyalty_multiplier_amount),
            minRedemptionPoints: Number(form.loyalty_min_points),
            // Required by the existing API, retained for historical records.
            pointValue: Math.max(1, Number(form.loyalty_point_value || 100)),
            earningMode: 'TRANSACTION_THRESHOLD',
            redemptionMode: 'FREE_PRODUCT',
          });
        else {
          const payload = new FormData();
          const mapping: Record<string, string> = {
            storeName: 'storeName',
            storeAddress: 'address',
            storePhone: 'phone',
            receiptFooter: 'receiptFooter',
            taxRate: 'taxRate',
            showImages: 'showImages',
            enableShift: 'enableShift',
            enableShiftReminder: 'enableShiftReminder',
            shiftDurationMinutes: 'shiftDurationMinutes',
            shiftReminderMinutes: 'shiftReminderMinutes',
            shiftDayCutoff: 'shiftDayCutoff',
          };
          for (const [key, serverKey] of Object.entries(mapping))
            payload.append(serverKey, String(form[key] ?? ''));
          payload.append('enableCash', 'true');
          if (logo?.uri)
            payload.append('logo', {
              uri: logo.uri,
              name: logo.fileName || 'logo.png',
              type: logo.type || 'image/png',
            } as any);
          await api.put('/settings', payload, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          setLogo(null);
        }
        await bootstrapRetail();
      } else {
        const device = {
          printerAddress: form.printerAddress || null,
          printerType: form.printerType || null,
          theme: form.theme,
          showLogoOnReceipt: Boolean(form.showLogoOnReceipt),
        };
        await saveDeviceSettings(device);
        useStore
          .getState()
          .setSettings({ ...useStore.getState().settings, ...device });
        setScheme(form.theme);
      }
      dirty.current = false;
      setForm(useStore.getState().settings);
      Alert.alert('Tersimpan', 'Pengaturan berhasil disimpan.');
    } catch (error) {
      showApiError(
        'Gagal Menyimpan Pengaturan',
        error,
        'Periksa isian dan koneksi.',
      );
    } finally {
      setBusy(false);
    }
  };
  const scan = async () => {
    setBusy(true);
    setDevices([]);
    try {
      if (printerType === 'BLE' && !(await requestPrinterPermissions()))
        throw new Error('Izin Bluetooth diperlukan.');
      const driver =
        printerType === 'BLE'
          ? (Printers as any).BLEPrinter
          : (Printers as any).USBPrinter;
      await driver.init();
      setDevices(await driver.getDeviceList());
    } catch (error: any) {
      Alert.alert(
        'Printer Belum Ditemukan',
        error.message || 'Nyalakan Bluetooth atau sambungkan kabel OTG.',
      );
    } finally {
      setBusy(false);
    }
  };
  const connect = async (device: any) => {
    setBusy(true);
    try {
      const address =
        printerType === 'BLE'
          ? device.inner_mac_address
          : `${device.vendor_id}|${device.product_id}`;
      await connectConfiguredPrinter({ printerAddress: address, printerType });
      update('printerAddress', address);
      update('printerType', printerType);
      Alert.alert('Printer Dipilih', 'Tekan Simpan agar pilihan tersimpan.');
    } catch (error: any) {
      Alert.alert('Gagal Menghubungkan', error.message);
    } finally {
      setBusy(false);
    }
  };
  const test = async () => {
    setBusy(true);
    try {
      const printer = await connectConfiguredPrinter(form);
      await printer.printText(
        `\nIWEARING HIJAB\nTEST PRINT 58mm\n--------------------------------\nPrinter siap digunakan\n\n\n`,
      );
    } catch (error: any) {
      Alert.alert('Test Print Belum Berhasil', error.message);
    } finally {
      setBusy(false);
    }
  };
  const toggle = (key: string, title: string) => (
    <View style={tw`flex-row items-center justify-between py-3`}>
      <Text style={tw`text-gray-700 dark:text-gray-200 flex-1`}>{title}</Text>
      <Switch
        value={Boolean(form[key])}
        onValueChange={value => update(key, value)}
        trackColor={{ true: tw.color('blue-600') }}
      />
    </View>
  );
  return (
    <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
      <Title title="Pengaturan" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={tw`p-4 pb-12`}
      >
        <Chips
          value={tab}
          options={[
            { value: 'device', label: 'Tema' },
            { value: 'printer', label: 'Printer' },
            ...(manager
              ? [
                  { value: 'profile', label: 'Profil Toko' },
                  { value: 'business', label: 'Operasional' },
                  { value: 'loyalty', label: 'Loyalitas' },
                ]
              : []),
          ]}
          onChange={setTab}
        />
        {tab === 'device' && (
          <Card>
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`text-gray-700 dark:text-gray-200`}>
                Tema gelap
              </Text>
              <Switch
                value={form.theme === 'dark'}
                onValueChange={value =>
                  update('theme', value ? 'dark' : 'light')
                }
              />
            </View>
          </Card>
        )}
        {tab === 'printer' && (
          <Card>
            <Text style={tw`font-bold text-gray-900 dark:text-white mb-3`}>
              Printer 58 mm
            </Text>
            <Text style={tw`text-gray-500 text-xs`}>
              {form.printerType || '-'} ·{' '}
              {form.printerAddress || 'Belum dipilih'}
            </Text>
            <Chips
              options={['BLE', 'USB']}
              value={printerType}
              onChange={(value: 'BLE' | 'USB') => {
                setPrinterType(value);
                setDevices([]);
              }}
            />
            <Button
              title={busy ? 'Memproses...' : 'Cari Printer'}
              secondary
              disabled={busy}
              onPress={scan}
            />
            {devices.map((device, index) => (
              <Button
                key={index}
                title={
                  device.device_name ||
                  device.inner_mac_address ||
                  `${device.vendor_id}:${device.product_id}`
                }
                secondary
                disabled={busy}
                onPress={() => connect(device)}
              />
            ))}
            {toggle('showLogoOnReceipt', 'Logo pada struk')}
            <Button
              title="Test Print"
              secondary
              disabled={busy || !form.printerAddress}
              onPress={test}
            />
          </Card>
        )}
        {manager && tab === 'profile' && (
          <Card>
            {[
              ['storeName', 'Nama Toko'],
              ['storeAddress', 'Alamat'],
              ['storePhone', 'Telepon'],
              ['receiptFooter', 'Catatan Kaki Struk'],
            ].map(([key, title]) => (
              <Field
                key={key}
                label={title}
                value={String(form[key] || '')}
                onChangeText={(value: string) => update(key, value)}
              />
            ))}
            <Button
              title={logo ? 'Logo dipilih · pilih ulang' : 'Pilih Logo Toko'}
              secondary
              onPress={async () => {
                const result = await launchImageLibrary({
                  mediaType: 'photo',
                  maxHeight: 1200,
                  maxWidth: 1200,
                });
                if (result.assets?.[0]) setLogo(result.assets[0]);
              }}
            />
          </Card>
        )}
        {manager && tab === 'business' && (
          <Card>
            {toggle('enableShift', 'Wajib buka shift')}
            {toggle('enableShiftReminder', 'Pengingat tutup shift')}
            {toggle('showImages', 'Gambar produk')}
            <Field
              label="Durasi shift (menit)"
              keyboardType="numeric"
              value={String(form.shiftDurationMinutes)}
              onChangeText={(value: string) =>
                update('shiftDurationMinutes', value)
              }
            />
            <Field
              label="Pengingat sebelum tutup (menit)"
              keyboardType="numeric"
              value={String(form.shiftReminderMinutes)}
              onChangeText={(value: string) =>
                update('shiftReminderMinutes', value)
              }
            />
            <Field
              label="Batas tutup harian (HH:mm)"
              value={form.shiftDayCutoff}
              onChangeText={(value: string) => update('shiftDayCutoff', value)}
            />
            <Field
              label="Pajak (%)"
              keyboardType="numeric"
              value={String(form.taxRate)}
              onChangeText={(value: string) => update('taxRate', value)}
            />
          </Card>
        )}
        {manager && tab === 'loyalty' && (
          <Card>
            {toggle('loyalty_active', 'Program poin aktif')}
            {[
              [
                'loyalty_multiplier_amount',
                'Nominal belanja per kelipatan poin',
              ],
              ['loyalty_multiplier', 'Poin per kelipatan'],
              ['loyalty_min_points', 'Poin untuk satu produk gratis'],
            ].map(([key, title]) => (
              <Field
                key={key}
                label={title}
                value={String(form[key])}
                keyboardType="numeric"
                onChangeText={(value: string) =>
                  update(key, value.replace(/[^0-9]/g, ''))
                }
              />
            ))}
          </Card>
        )}
        <Button
          title={busy ? 'Memproses...' : 'Simpan'}
          disabled={busy}
          onPress={save}
        />
        {manager && (
          <Button
            title="Pengguna"
            secondary
            onPress={() => navigation.navigate('UserManagement')}
          />
        )}
        <Button
          title="Keluar Akun"
          secondary
          disabled={busy}
          onPress={() =>
            Alert.alert('Keluar Akun', 'Akhiri sesi pada perangkat ini?', [
              { text: 'Batal', style: 'cancel' },
              {
                text: 'Keluar',
                onPress: async () => {
                  await logoutSaas();
                  useStore.getState().clearCart();
                  useStore.getState().setActiveShift(null);
                  useStore.getState().setUser(null);
                  navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                },
              },
            ])
          }
        />
      </ScrollView>
    </View>
  );
}
