import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera, CameraType } from 'react-native-camera-kit';
import { Button, Chips, Empty, Field, Title, tw } from './ui';
import { fetchCategories, fetchProducts } from '../services/saasDataService';
import { resolveApiAssetUrl, showApiError } from '../services/api';
import { useStore } from '../store/useStore';
import { matchesProduct, productLabel, rupiah } from './policy';

export default function POSScreen({ navigation }: any) {
  const cart = useStore(s => s.cart);
  const settings = useStore(s => s.settings);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [camera, setCamera] = useState(false);
  const scanLock = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([fetchProducts(), fetchCategories()]);
      setProducts(p);
      setCategories(c);
    } catch (error) {
      showApiError('Produk Belum Dimuat', error, 'Periksa koneksi internet.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    return navigation.addListener('focus', load);
  }, [load, navigation]);
  const add = (product: any) => {
    const current = useStore.getState();
    const quantity = current.cart
      .filter(line => Number(line.id) === product.id)
      .reduce((sum, line) => sum + line.quantity, 0);
    if (!product.isUnlimitedStock && quantity >= Number(product.stock))
      return Alert.alert('Stok Tidak Cukup', productLabel(product));
    current.addToCart({
      ...product,
      name: productLabel(product),
      price: Number(product.finalPrice ?? product.price),
      originalPrice: Number(product.originalPrice ?? product.price),
      isUnlimitedStock: product.isUnlimitedStock ? 1 : 0,
    });
  };
  const scan = (code: string) => {
    const product = products.find(
      item =>
        item.isActive !== false &&
        [item.barcode, item.sku].includes(code.trim()),
    );
    if (product) {
      add(product);
      setSearch('');
    } else {
      setSearch(code);
      Alert.alert(
        'Produk Tidak Ditemukan',
        'Barcode atau SKU belum terdaftar.',
      );
    }
  };
  const openCamera = async () => {
    if (
      Platform.OS === 'android' &&
      (await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      )) !== 'granted'
    )
      return;
    scanLock.current = false;
    setCamera(true);
  };
  return (
    <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
      <Title title="Kasir" navigation={navigation}>
        <Field
          label="Cari produk, varian, warna, SKU / barcode"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => scan(search)}
          autoCapitalize="none"
        />
        <Button title="Scan QR / Barcode" secondary onPress={openCamera} />
        <Chips
          options={[
            { value: 'all', label: 'Semua' },
            ...categories.map(item => ({
              value: String(item.id),
              label: item.name,
            })),
          ]}
          value={category}
          onChange={setCategory}
        />
      </Title>
      <FlatList
        data={products.filter(
          item =>
            item.isActive !== false &&
            matchesProduct(item, search) &&
            (category === 'all' || String(item.categoryId) === category),
        )}
        keyExtractor={item => String(item.id)}
        numColumns={2}
        contentContainerStyle={tw`p-2 pb-28`}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        ListEmptyComponent={
          <Empty loading={loading} text="Produk tidak ditemukan." />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => add(item)}
            style={tw`flex-1 m-1 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800`}
          >
            {settings.showImages && item.imageUrl && (
              <Image
                source={{ uri: resolveApiAssetUrl(item.imageUrl) || undefined }}
                resizeMode="cover"
                style={tw`w-full h-24 rounded-xl mb-3`}
              />
            )}
            <Text style={tw`font-bold text-gray-900 dark:text-white`}>
              {productLabel(item)}
            </Text>
            {Number(item.originalPrice) > Number(item.finalPrice) && (
              <Text style={tw`text-xs text-gray-400 line-through mt-2`}>
                {rupiah(item.originalPrice)}
              </Text>
            )}
            <Text style={tw`font-bold text-blue-600 mt-2`}>
              {rupiah(item.finalPrice ?? item.price)}
            </Text>
            <Text style={tw`text-xs text-gray-500 mt-1`}>
              {item.isUnlimitedStock
                ? 'Stok tak terbatas'
                : `Stok ${item.stock}`}
            </Text>
          </TouchableOpacity>
        )}
      />
      {cart.length > 0 && (
        <View style={tw`absolute bottom-3 left-4 right-4`}>
          <Button
            title={`Keranjang (${cart.reduce(
              (sum, item) => sum + item.quantity,
              0,
            )}) · ${rupiah(
              cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
            )}`}
            onPress={() => {
              const state = useStore.getState();
              if (state.settings.enableShift && !state.activeShift)
                return Alert.alert(
                  'Buka Shift',
                  'Buka shift terlebih dahulu di Beranda.',
                );
              navigation.navigate('Checkout');
            }}
          />
        </View>
      )}
      <Modal visible={camera} onRequestClose={() => setCamera(false)}>
        <View style={tw`flex-1 bg-black`}>
          <Camera
            style={tw`flex-1`}
            cameraType={CameraType.Back}
            scanBarcode
            showFrame
            onReadCode={(event: any) => {
              const code = event?.nativeEvent?.codeStringValue;
              if (!code || scanLock.current) return;
              scanLock.current = true;
              setCamera(false);
              scan(code);
            }}
          />
          <Button title="Tutup Scanner" onPress={() => setCamera(false)} />
        </View>
      </Modal>
    </View>
  );
}
