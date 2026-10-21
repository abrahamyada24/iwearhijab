import React from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Title, tw } from './ui';
export default function InventoryScreen({ navigation }: any) {
  return (
    <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
      <Title title="Produk & Stok" />
      <ScrollView contentContainerStyle={tw`p-5`}>
        <Button
          title="Daftar Produk"
          onPress={() => navigation.navigate('ProductList')}
        />
        <Button
          title="Kategori"
          secondary
          onPress={() => navigation.navigate('CategoryList')}
        />
        <Button
          title="Riwayat Stok"
          secondary
          onPress={() => navigation.navigate('StockHistory')}
        />
      </ScrollView>
    </View>
  );
}
