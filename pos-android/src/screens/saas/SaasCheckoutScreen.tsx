import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import tw, { useAppColorScheme } from 'twrnc';
import { createTransaction, fetchCustomers } from '../../services/saasDataService';
import { showApiError } from '../../services/api';
import { useStore } from '../../store/useStore';
import { createIdempotencyKey, fingerprintPayload } from '../../utils/idempotency';

const rupiah = (value: unknown) => `Rp ${Math.round(Number(value || 0)).toLocaleString('id-ID')}`;

export default function SaasCheckoutScreen({ navigation }: any) {
    useAppColorScheme(tw);
    const cart = useStore(state => state.cart);
    const clearCart = useStore(state => state.clearCart);
    const cartSubtotal = useStore(state => state.cartSubtotal);
    const cartTotal = useStore(state => state.cartTotal);
    const discount = useStore(state => state.discount);
    const discountType = useStore(state => state.discountType);
    const [customers, setCustomers] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [paymentType, setPaymentType] = useState<'CASH' | 'QRIS_MANUAL' | 'TRANSFER'>('CASH');
    const [cashAmount, setCashAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const pendingCheckout = useRef<{ fingerprint: string; key: string } | null>(null);

    useEffect(() => {
        fetchCustomers().then(setCustomers).catch(() => setCustomers([]));
    }, []);

    const subtotal = cartSubtotal();
    const total = cartTotal();
    const numericCash = Number(cashAmount || 0);
    const change = paymentType === 'CASH' ? Math.max(0, numericCash - total) : 0;
    const computedDiscount = useMemo(() => Math.max(0, subtotal - total), [subtotal, total]);

    const checkout = async () => {
        if (cart.length === 0) return;
        if (paymentType === 'CASH' && numericCash < total) {
            Alert.alert('Uang Kurang', `Masih kurang ${rupiah(total - numericCash)}.`);
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                customerId: selectedCustomer?.id || null,
                customerName: selectedCustomer?.name || 'Umum',
                items: cart.map(item => ({
                    productId: Number(item.id),
                    qty: item.quantity,
                    notes: item.notes || null,
                    addonIds: item.addonIds || [],
                    addons: item.addons || [],
                })),
                payment: {
                    type: paymentType,
                    cashAmount: paymentType === 'CASH' ? numericCash : total,
                    changeAmount: change,
                },
                orderType: 'TAKE_AWAY',
                discountAmount: discount,
                discountType,
                loyaltyPointsRedeemed: 0,
            };
            const fingerprint = fingerprintPayload(payload);
            if (!pendingCheckout.current || pendingCheckout.current.fingerprint !== fingerprint) {
                pendingCheckout.current = {
                    fingerprint,
                    key: createIdempotencyKey('checkout'),
                };
            }
            const transaction = await createTransaction(payload, pendingCheckout.current.key);

            const receiptData = {
                invoiceNumber: transaction.invoiceNumber,
                createdAt: transaction.createdAt,
                items: cart,
                customerName: selectedCustomer?.name || 'Umum',
                customerPhone: selectedCustomer?.phone || null,
                subtotal,
                discountAmount: computedDiscount,
                total: Number(transaction.grandTotal || total),
                paymentMethod: paymentType,
                cashAmount: paymentType === 'CASH' ? numericCash : total,
                changeAmount: change,
                paymentStatus: 'PAID',
                paidAmount: Number(transaction.grandTotal || total),
                remainingAmount: 0,
                paidAt: transaction.createdAt,
                orderType: 'TAKE_AWAY',
                tableName: null,
            };
            pendingCheckout.current = null;
            clearCart();
            navigation.replace('ReceiptPreview', { receiptData });
        } catch (error: any) {
            showApiError('Transaksi Gagal', error, 'Server tidak dapat memproses transaksi.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={tw`flex-1 bg-gray-50 dark:bg-gray-950`}>
            <View style={tw`bg-white dark:bg-gray-900 px-4 py-3 flex-row items-center border-b border-gray-200 dark:border-gray-800`}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2 mr-2`}><Icon name="arrow-left" size={23} color={tw.color('gray-700')} /></TouchableOpacity>
                <Text style={tw`text-xl font-black text-gray-900 dark:text-white`}>Pembayaran</Text>
            </View>
            <ScrollView contentContainerStyle={tw`p-4 pb-32`}>
                <View style={tw`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-4`}>
                    <Text style={tw`font-black text-gray-900 dark:text-white mb-3`}>Pelanggan</Text>
                    <FlatList
                        horizontal
                        data={[{ id: null, name: 'Umum' }, ...customers]}
                        keyExtractor={item => String(item.id ?? 'general')}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => {
                            const active = (item.id == null && selectedCustomer == null) || item.id === selectedCustomer?.id;
                            return (
                                <TouchableOpacity onPress={() => setSelectedCustomer(item.id == null ? null : item)} style={active ? tw`bg-blue-600 px-4 py-2 rounded-full mr-2` : tw`bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-full mr-2`}>
                                    <Text style={active ? tw`text-white font-bold text-xs` : tw`text-gray-600 dark:text-gray-200 font-bold text-xs`}>{item.name}</Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>

                <View style={tw`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 mb-4`}>
                    <Text style={tw`font-black text-gray-900 dark:text-white mb-3`}>Ringkasan</Text>
                    {cart.map(item => (
                        <View key={item.cartItemId} style={tw`flex-row py-2 border-b border-gray-100 dark:border-gray-700`}>
                            <Text style={tw`text-gray-500 mr-3`}>{item.quantity}×</Text>
                            <Text style={tw`flex-1 text-gray-900 dark:text-white font-bold`}>{item.name}</Text>
                            <Text style={tw`text-gray-700 dark:text-gray-200 font-bold`}>{rupiah(item.price * item.quantity)}</Text>
                        </View>
                    ))}
                    <View style={tw`flex-row mt-4`}><Text style={tw`flex-1 text-gray-500`}>Subtotal</Text><Text style={tw`font-bold text-gray-900 dark:text-white`}>{rupiah(subtotal)}</Text></View>
                    {computedDiscount > 0 && <View style={tw`flex-row mt-2`}><Text style={tw`flex-1 text-green-600`}>Diskon</Text><Text style={tw`font-bold text-green-600`}>- {rupiah(computedDiscount)}</Text></View>}
                    <View style={tw`flex-row mt-3 pt-3 border-t border-gray-200 dark:border-gray-700`}><Text style={tw`flex-1 font-black text-gray-900 dark:text-white text-lg`}>Total</Text><Text style={tw`font-black text-blue-600 text-xl`}>{rupiah(total)}</Text></View>
                </View>

                <Text style={tw`font-black text-gray-900 dark:text-white mb-3`}>Metode Pembayaran</Text>
                <View style={tw`flex-row mb-4`}>
                    {(['CASH', 'QRIS_MANUAL', 'TRANSFER'] as const).map(method => (
                        <TouchableOpacity key={method} onPress={() => setPaymentType(method)} style={paymentType === method ? tw`flex-1 bg-blue-600 rounded-xl py-3 items-center mx-1` : tw`flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 items-center mx-1`}>
                            <Text style={paymentType === method ? tw`text-white font-black text-xs` : tw`text-gray-500 font-black text-xs`}>{method === 'QRIS_MANUAL' ? 'QRIS' : method}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {paymentType === 'CASH' && (
                    <View style={tw`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4`}>
                        <Text style={tw`font-bold text-gray-700 dark:text-gray-200 mb-2`}>Uang diterima</Text>
                        <TextInput value={cashAmount ? Number(cashAmount).toLocaleString('id-ID') : ''} onChangeText={value => setCashAmount(value.replace(/[^0-9]/g, ''))} keyboardType="numeric" placeholder="0" style={tw`border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-lg font-black text-gray-900 dark:text-white`} placeholderTextColor={tw.color('gray-400')} />
                        <TouchableOpacity onPress={() => setCashAmount(String(total))} style={tw`self-start bg-blue-50 rounded-lg px-3 py-2 mt-2`}><Text style={tw`text-blue-700 font-bold text-xs`}>Uang pas</Text></TouchableOpacity>
                        <View style={tw`flex-row mt-3`}><Text style={tw`flex-1 text-gray-500`}>Kembalian</Text><Text style={tw`font-black text-gray-900 dark:text-white`}>{rupiah(change)}</Text></View>
                    </View>
                )}
            </ScrollView>

            <TouchableOpacity disabled={submitting || cart.length === 0} onPress={checkout} style={tw`absolute left-4 right-4 bottom-4 bg-gray-900 rounded-2xl py-4 items-center disabled:opacity-50`}>
                {submitting ? <ActivityIndicator color="white" /> : <Text style={tw`text-white text-lg font-black`}>Bayar {rupiah(total)}</Text>}
            </TouchableOpacity>
        </View>
    );
}
