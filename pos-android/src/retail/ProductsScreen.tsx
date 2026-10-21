import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Switch,
  Text,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Button, Card, Chips, Empty, Field, Sheet, Title, tw } from './ui';
import { useStore } from '../store/useStore';
import api, { resolveApiAssetUrl, showApiError } from '../services/api';
import { fetchCategories, fetchProducts } from '../services/saasDataService';
import { isManager, matchesProduct, productLabel, rupiah } from './policy';
import ProductDiscountFields, {
  createDiscountValues,
  getDiscountScheduleForSave,
  validateDiscountSchedule,
} from '../components/ProductDiscountFields';
import ProductLabel from './ProductLabel';

export default function ProductsScreen({ route, navigation }: any) {
  const categoryOnly = route.name === 'CategoryList';
  const manager = isManager(useStore(s => s.user));
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [image, setImage] = useState<any>(null);
  const [discount, setDiscount] = useState(createDiscountValues());
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState<any>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const cats = await fetchCategories();
      setCategories(cats);
      setItems(categoryOnly ? cats : await fetchProducts());
    } catch (error) {
      showApiError('Data Belum Dimuat', error, 'Periksa koneksi internet.');
    } finally {
      setLoading(false);
    }
  }, [categoryOnly]);
  useEffect(() => {
    load();
    return navigation.addListener('focus', load);
  }, [load, navigation]);
  const edit = (item?: any) => {
    if (!manager) return;
    setEditing(item || null);
    setForm({
      name: '',
      variant: '',
      color: '',
      sku: '',
      barcode: '',
      price: '',
      costPrice: '',
      stock: '',
      minStock: '0',
      categoryId: categories[0]?.id || '',
      isActive: true,
      isUnlimitedStock: false,
      enableCostPrice: false,
      ...item,
    });
    setImage(null);
    setDiscount(createDiscountValues(item));
    setOpen(true);
  };
  const update = (key: string, value: any) =>
    setForm((current: any) => ({ ...current, [key]: value }));
  const save = async () => {
    if (!isManager(useStore.getState().user) || busy) return;
    if (!form.name?.trim())
      return Alert.alert('Data Belum Lengkap', 'Nama wajib diisi.');
    if (
      !categoryOnly &&
      (!form.categoryId ||
        !Number.isFinite(Number(form.price)) ||
        Number(form.price) < 0 ||
        !Number.isFinite(Number(form.costPrice || 0)) ||
        Number(form.costPrice || 0) < 0 ||
        !Number.isInteger(Number(form.stock || 0)) ||
        Number(form.stock || 0) < 0)
    )
      return Alert.alert(
        'Data Tidak Valid',
        'Pilih kategori dan isi harga/stok yang valid.',
      );
    const validation = validateDiscountSchedule(discount);
    if (!categoryOnly && validation)
      return Alert.alert('Diskon Belum Lengkap', validation);
    if (
      !categoryOnly &&
      discount.active &&
      (!Number.isFinite(Number(discount.value)) ||
        Number(discount.value) < 0 ||
        (discount.type === 'PERCENT' && Number(discount.value) > 100))
    )
      return Alert.alert(
        'Diskon Tidak Valid',
        'Persentase diskon maksimal 100%.',
      );
    setBusy(true);
    try {
      const payload = new FormData();
      payload.append('name', form.name.trim());
      if (!categoryOnly) {
        for (const key of [
          'variant',
          'color',
          'sku',
          'barcode',
          'price',
          'costPrice',
          'stock',
          'minStock',
          'categoryId',
          'isActive',
          'isUnlimitedStock',
          'enableCostPrice',
        ])
          payload.append(key, String(form[key] ?? ''));
        const schedule = getDiscountScheduleForSave(discount);
        const values = {
          discountActive: discount.active,
          discountType: discount.type,
          discountValue: discount.value || '0',
          discountLabel: discount.label,
          discountStartAt: schedule.startAt || '',
          discountEndAt: schedule.endAt || '',
          discountStartTime: schedule.startTime || '',
          discountEndTime: schedule.endTime || '',
          discountDays: schedule.days || '',
        };
        for (const [key, value] of Object.entries(values))
          payload.append(key, String(value));
      }
      if (image?.uri)
        payload.append('image', {
          uri: image.uri,
          name: image.fileName || 'product.jpg',
          type: image.type || 'image/jpeg',
        } as any);
      const endpoint = categoryOnly ? '/products/categories' : '/products';
      if (editing)
        await api.put(`${endpoint}/${editing.id}`, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      else
        await api.post(endpoint, payload, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      setOpen(false);
      await load();
    } catch (error) {
      showApiError('Gagal Menyimpan', error, 'Data belum tersimpan.');
    } finally {
      setBusy(false);
    }
  };
  const remove = (item: any) => {
    if (!isManager(useStore.getState().user)) return;
    Alert.alert('Hapus Data', `Hapus ${item.name}?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(
              `${categoryOnly ? '/products/categories' : '/products'}/${
                item.id
              }`,
            );
            await load();
          } catch (error) {
            showApiError('Gagal Menghapus', error, 'Data masih digunakan.');
          }
        },
      },
    ]);
  };
  return (
    <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
      <Title
        title={categoryOnly ? 'Kategori' : 'Daftar Produk'}
        navigation={navigation}
      >
        <Field label="Cari" value={search} onChangeText={setSearch} />
        {manager && (
          <Button
            title={categoryOnly ? 'Tambah Kategori' : 'Tambah Produk'}
            onPress={() => edit()}
          />
        )}
      </Title>
      <FlatList
        data={items.filter(item => matchesProduct(item, search))}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={tw`p-4 pb-12`}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        ListEmptyComponent={<Empty loading={loading} />}
        renderItem={({ item }) => (
          <Card>
            {item.imageUrl && (
              <Image
                source={{ uri: resolveApiAssetUrl(item.imageUrl) || undefined }}
                style={tw`h-28 rounded-xl mb-3`}
                resizeMode="contain"
              />
            )}
            <Text style={tw`font-bold text-gray-900 dark:text-white`}>
              {productLabel(item)}
            </Text>
            {!categoryOnly && (
              <>
                <Text style={tw`text-blue-600 font-bold mt-2`}>
                  {rupiah(item.finalPrice ?? item.price)}
                </Text>
                <Text style={tw`text-xs text-gray-500 mt-1`}>
                  {item.sku} · {item.category?.name} ·{' '}
                  {item.isUnlimitedStock
                    ? 'Stok tak terbatas'
                    : `Stok ${item.stock}`}{' '}
                  · {item.isActive ? 'Aktif' : 'Nonaktif'}
                </Text>
                <Button
                  title="Label QR"
                  secondary
                  onPress={() => setLabel(item)}
                />
              </>
            )}
            {manager && (
              <View style={tw`flex-row`}>
                <View style={tw`flex-1 mr-2`}>
                  <Button title="Edit" secondary onPress={() => edit(item)} />
                </View>
                <View style={tw`flex-1`}>
                  <Button
                    title="Hapus"
                    secondary
                    onPress={() => remove(item)}
                  />
                </View>
              </View>
            )}
          </Card>
        )}
      />
      <Sheet
        visible={open && manager}
        onClose={() => setOpen(false)}
        busy={busy}
        title={`${editing ? 'Edit' : 'Tambah'} ${
          categoryOnly ? 'Kategori' : 'Produk'
        }`}
      >
        <Field
          label="Nama"
          value={String(form.name || '')}
          onChangeText={(value: string) => update('name', value)}
        />
        {!categoryOnly && (
          <>
            <Field
              label="Varian"
              value={String(form.variant || '')}
              onChangeText={(value: string) => update('variant', value)}
            />
            <Field
              label="Warna"
              value={String(form.color || '')}
              onChangeText={(value: string) => update('color', value)}
            />
            <Field
              label="SKU (otomatis jika kosong)"
              value={String(form.sku || '')}
              onChangeText={(value: string) => update('sku', value)}
              autoCapitalize="characters"
            />
            <Field
              label="Barcode"
              value={String(form.barcode || '')}
              onChangeText={(value: string) => update('barcode', value)}
            />
            <Field
              label="Harga"
              keyboardType="numeric"
              value={String(form.price ?? '')}
              onChangeText={(value: string) =>
                update('price', value.replace(/[^0-9]/g, ''))
              }
            />
            <Field
              label="HPP"
              keyboardType="numeric"
              value={String(form.costPrice ?? '')}
              onChangeText={(value: string) =>
                update('costPrice', value.replace(/[^0-9]/g, ''))
              }
            />
            <Field
              label="Stok"
              keyboardType="numeric"
              value={String(form.stock ?? '')}
              onChangeText={(value: string) =>
                update('stock', value.replace(/[^0-9]/g, ''))
              }
            />
            <Text style={tw`text-gray-500 text-xs mb-2`}>Kategori</Text>
            <Chips
              options={categories.map(item => ({
                value: item.id,
                label: item.name,
              }))}
              value={form.categoryId}
              onChange={(value: any) => update('categoryId', value)}
            />
            {[
              ['isActive', 'Aktif'],
              ['isUnlimitedStock', 'Stok tak terbatas'],
              ['enableCostPrice', 'Gunakan HPP'],
            ].map(([key, title]) => (
              <View
                key={key}
                style={tw`flex-row justify-between items-center mb-3`}
              >
                <Text style={tw`text-gray-700 dark:text-gray-200`}>
                  {title}
                </Text>
                <Switch
                  value={Boolean(form[key])}
                  onValueChange={value => update(key, value)}
                />
              </View>
            ))}
            <ProductDiscountFields values={discount} onChange={setDiscount} />
          </>
        )}
        <Button
          title={image ? 'Gambar dipilih · pilih ulang' : 'Pilih Gambar'}
          secondary
          onPress={async () => {
            const result = await launchImageLibrary({
              mediaType: 'photo',
              maxWidth: 1200,
              maxHeight: 1200,
            });
            if (result.assets?.[0]) setImage(result.assets[0]);
          }}
        />
        <Button
          title={busy ? 'Menyimpan...' : 'Simpan'}
          onPress={save}
          disabled={busy}
        />
      </Sheet>
      <ProductLabel product={label} onClose={() => setLabel(null)} />
    </View>
  );
}
