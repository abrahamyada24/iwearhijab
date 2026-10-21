import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { Button, Card, Chips, Field, Sheet, Title, tw } from './ui';
import { useStore } from '../store/useStore';
import { showApiError } from '../services/api';
import { fetchCustomers, fetchProducts } from '../services/saasDataService';
import { sendCheckout } from './checkoutRequest';
import { checkoutTotals, receiptFromTransaction, rupiah } from './policy';

export default function CheckoutScreen({ navigation }: any) {
  const cart = useStore(s => s.cart);
  const settings = useStore(s => s.settings);
  const [members, setMembers] = useState<any[]>([]);
  const [member, setMember] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('CASH');
  const [cash, setCash] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountType, setDiscountType] = useState('amount');
  const [rewards, setRewards] = useState<Record<string, number>>({});
  const [rewardOpen, setRewardOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [membersError, setMembersError] = useState(false);
  const lock = useRef(false);
  const loadMembers = async () => {
    try {
      setMembers(await fetchCustomers());
      setMembersError(false);
    } catch {
      setMembersError(true);
    }
  };
  useEffect(() => {
    loadMembers();
  }, []);
  const rewardCount = Object.values(rewards).reduce((sum, qty) => sum + qty, 0);
  const pointsPerReward = Math.max(1, Number(settings.loyalty_min_points));
  const points = rewardCount * pointsPerReward;
  const totals = checkoutTotals(
    cart,
    rewards,
    Number(discount || 0),
    discountType,
    Number(settings.taxRate),
  );
  const effectiveMethod = totals.total === 0 && points > 0 ? 'POINT' : method;
  const change =
    method === 'CASH' ? Math.max(0, Number(cash) - totals.total) : 0;
  const updateQuantity = (item: any, delta: number) => {
    const quantity = item.quantity + delta;
    if (!item.isUnlimitedStock && quantity > Number(item.stock))
      return Alert.alert('Stok Tidak Cukup', item.name);
    useStore.getState().updateCartQuantity(item.cartItemId, quantity);
    setRewards(current => ({
      ...current,
      [item.cartItemId]: Math.min(
        Math.max(0, quantity),
        current[item.cartItemId] || 0,
      ),
    }));
  };
  const submit = async () => {
    if (lock.current || !cart.length) return;
    if (discountType === 'percent' && Number(discount) > 100)
      return Alert.alert('Diskon Tidak Valid', 'Maksimal 100%.');
    if (effectiveMethod === 'CASH' && Number(cash) < totals.total)
      return Alert.alert(
        'Uang Kurang',
        `Kurang ${rupiah(totals.total - Number(cash))}.`,
      );
    if (points > Number(member?.points || 0))
      return Alert.alert('Poin Tidak Cukup', 'Kurangi jumlah produk gratis.');
    lock.current = true;
    setBusy(true);
    try {
      const payload = {
        customerId: member?.id || null,
        customerName: member?.name || 'Umum',
        items: cart.map(item => ({
          productId: Number(item.id),
          qty: item.quantity,
          notes: item.notes || null,
          loyaltyRewardQty: rewards[item.cartItemId] || 0,
        })),
        payment: {
          type: effectiveMethod,
          cashAmount: effectiveMethod === 'CASH' ? Number(cash) : totals.total,
        },
        discountAmount: Number(discount || 0),
        discountType,
        loyaltyPointsRedeemed: points,
      };
      const fallback = {
        customerName: member?.name,
        customerPhone: member?.phone,
        items: cart,
      };
      const { transaction } = await sendCheckout(
        useStore.getState().user,
        payload,
        fallback,
      );
      const receiptData = receiptFromTransaction(transaction, fallback);
      useStore.getState().clearCart();
      navigation.replace('ReceiptPreview', { receiptData, autoPrint: true });
    } catch (error: any) {
      // Refresh stale prices and balances only after a definitive server rejection.
      // Network failures retain the same request and key for an idempotent retry.
      if (error.response?.status >= 400 && error.response?.status < 500) {
        const [freshProducts, freshMembers] = await Promise.allSettled([
          fetchProducts(),
          fetchCustomers(),
        ]);
        if (freshMembers.status === 'fulfilled') {
          setMembers(freshMembers.value);
          if (member)
            setMember(
              freshMembers.value.find((item: any) => item.id === member.id) ||
                null,
            );
        }
        if (freshProducts.status === 'fulfilled')
          for (const line of cart) {
            const product = freshProducts.value.find(
              (item: any) => item.id === Number(line.id),
            );
            if (product)
              useStore.getState().updateCartItem(line.cartItemId, {
                price: Number(product.finalPrice ?? product.price),
                stock: Number(product.stock),
              });
          }
      }
      showApiError(
        'Transaksi Belum Berhasil',
        error,
        'Periksa koneksi lalu coba lagi.',
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  const pay = () => {
    if (effectiveMethod === 'QRIS')
      Alert.alert(
        'Konfirmasi QRIS',
        `Pastikan pembayaran ${rupiah(totals.total)} sudah diterima.`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Sudah Diterima', onPress: submit },
        ],
      );
    else submit();
  };
  return (
    <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
      <Title title="Pembayaran" navigation={navigation} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={tw`p-4 pb-12`}
      >
        <Card>
          <Field label="Cari Member" value={search} onChangeText={setSearch} />
          {membersError && (
            <Button title="Muat ulang Member" secondary onPress={loadMembers} />
          )}
          <Chips
            value={member?.id || 'general'}
            options={[
              { value: 'general', label: 'Umum' },
              ...members
                .filter(item =>
                  [item.name, item.memberId, item.phone]
                    .join(' ')
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map(item => ({
                  value: item.id,
                  label: `${item.name} · ${item.memberId || ''}`,
                })),
            ]}
            onChange={(value: any) => {
              setMember(members.find(item => item.id === value) || null);
              setRewards({});
            }}
          />
          {member && (
            <Text style={tw`text-blue-600 mt-2`}>
              Saldo {member.points || 0} poin
            </Text>
          )}
        </Card>
        <Card>
          {cart.map(item => (
            <View
              key={item.cartItemId}
              style={tw`mb-4 border-b border-gray-100 dark:border-gray-700 pb-3`}
            >
              <Text style={tw`font-bold text-gray-900 dark:text-white`}>
                {item.name}
              </Text>
              <Text style={tw`text-blue-600`}>
                {rupiah(item.price * item.quantity)}
              </Text>
              <View style={tw`flex-row items-center`}>
                <Button
                  title="−"
                  secondary
                  disabled={busy}
                  onPress={() => updateQuantity(item, -1)}
                />
                <Text style={tw`px-5 text-gray-900 dark:text-white`}>
                  {item.quantity}
                </Text>
                <Button
                  title="+"
                  secondary
                  disabled={busy}
                  onPress={() => updateQuantity(item, 1)}
                />
              </View>
            </View>
          ))}
          {cart.length === 0 && (
            <Text style={tw`text-gray-500`}>Keranjang kosong.</Text>
          )}
        </Card>
        <Card>
          <Field
            label="Diskon tambahan"
            value={discount}
            onChangeText={(value: string) =>
              setDiscount(value.replace(/[^0-9]/g, ''))
            }
            keyboardType="numeric"
          />
          <Chips
            value={discountType}
            options={[
              { value: 'amount', label: 'Rupiah' },
              { value: 'percent', label: 'Persen' },
            ]}
            onChange={setDiscountType}
          />
          {settings.loyalty_active && member && (
            <>
              <Button
                title={`Tukar Point · ${pointsPerReward} poin / produk`}
                secondary
                onPress={() => setRewardOpen(true)}
              />
              {points > 0 && (
                <>
                  <Text style={tw`text-blue-600`}>
                    {points} poin · {rewardCount} produk gratis
                  </Text>
                  <Button
                    title="Batalkan penukaran"
                    secondary
                    onPress={() => setRewards({})}
                  />
                </>
              )}
            </>
          )}
        </Card>
        <Card>
          <Text style={tw`text-gray-600 dark:text-gray-300`}>
            Subtotal: {rupiah(totals.subtotal)}
          </Text>
          <Text style={tw`text-gray-600 dark:text-gray-300 mt-2`}>
            Diskon + Tukar Point: −{rupiah(totals.discount)}
          </Text>
          <Text style={tw`text-gray-600 dark:text-gray-300 mt-2`}>
            Pajak: {rupiah(totals.tax)}
          </Text>
          <Text style={tw`text-2xl text-blue-600 font-bold mt-3`}>
            Total {rupiah(totals.total)}
          </Text>
        </Card>
        {effectiveMethod !== 'POINT' && (
          <>
            <Chips
              value={method}
              options={['CASH', 'QRIS']}
              onChange={setMethod}
            />
            {method === 'CASH' && (
              <Card>
                <Field
                  label="Uang diterima"
                  value={cash}
                  onChangeText={(value: string) =>
                    setCash(value.replace(/[^0-9]/g, ''))
                  }
                  keyboardType="numeric"
                />
                <Button
                  title="Uang pas"
                  secondary
                  onPress={() => setCash(String(totals.total))}
                />
                <Text style={tw`text-gray-900 dark:text-white mt-2`}>
                  Kembalian: {rupiah(change)}
                </Text>
              </Card>
            )}
          </>
        )}
        <Button
          title={
            busy
              ? 'Memproses...'
              : `Bayar ${effectiveMethod} · ${rupiah(totals.total)}`
          }
          disabled={busy || !cart.length}
          onPress={pay}
        />
        {busy && <ActivityIndicator color={tw.color('blue-600')} />}
      </ScrollView>
      <Sheet
        title="Tukar Point"
        visible={rewardOpen}
        onClose={() => setRewardOpen(false)}
      >
        <Text style={tw`text-gray-600 dark:text-gray-300 mb-4`}>
          Saldo {member?.points || 0} · Digunakan {points} · Sisa{' '}
          {Math.max(0, Number(member?.points || 0) - points)}
        </Text>
        {cart.map(item => (
          <Card key={item.cartItemId}>
            <Text style={tw`font-bold text-gray-900 dark:text-white`}>
              {item.name}
            </Text>
            <View style={tw`flex-row items-center`}>
              <Button
                title="−"
                secondary
                onPress={() =>
                  setRewards(current => ({
                    ...current,
                    [item.cartItemId]: Math.max(
                      0,
                      (current[item.cartItemId] || 0) - 1,
                    ),
                  }))
                }
              />
              <Text style={tw`px-4 text-gray-900 dark:text-white`}>
                {rewards[item.cartItemId] || 0}
              </Text>
              <Button
                title="+"
                secondary
                disabled={
                  (rewards[item.cartItemId] || 0) >= item.quantity ||
                  points + pointsPerReward > Number(member?.points || 0)
                }
                onPress={() =>
                  setRewards(current => ({
                    ...current,
                    [item.cartItemId]: (current[item.cartItemId] || 0) + 1,
                  }))
                }
              />
            </View>
          </Card>
        ))}
        <Button title="Gunakan pilihan" onPress={() => setRewardOpen(false)} />
      </Sheet>
    </View>
  );
}
