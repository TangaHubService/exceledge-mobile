import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { cancelSale, getEbmReceipt, getSaleById, reprintSaleReceipt } from '../../api/sales';
import { API_URL } from '../../api/client';
import { colors } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SaleDetail'>;

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  MOBILE_MONEY: 'Mobile Money',
  MTN_MOMO: 'MTN MoMo',
  AIRTEL_MONEY: 'Airtel Money',
  CREDIT_CARD: 'Bank Card',
  CARD: 'Bank Card',
  BANK: 'Bank Transfer',
  DEBT: 'Credit Sale',
  INSURANCE: 'Insurance',
  MIXED: 'Mixed Payment',
};

const bottomItems: Array<{
  key: 'Home' | 'Sales' | 'Products' | 'Customers' | 'More';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'Home', label: 'Home', icon: 'home' },
  { key: 'Sales', label: 'Sales', icon: 'cart-outline' },
  { key: 'Products', label: 'Products', icon: 'cube-outline' },
  { key: 'Customers', label: 'Customers', icon: 'people-outline' },
  { key: 'More', label: 'More', icon: 'ellipsis-horizontal' },
];

function normalizeImageUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${API_URL.replace(/\/api$/, '')}${url.startsWith('/') ? url : `/${url}`}`;
}

function amount(value: number | string | null | undefined): string {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value ?? 0))} RWF`;
}

function InformationRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-h-[40px] flex-row items-center justify-between">
      <Text className="text-[14px] text-gray-600">{label}</Text>
      <Text numberOfLines={2} className="ml-5 flex-1 text-right text-[14px] font-medium text-gray-950">{value}</Text>
    </View>
  );
}

export default function SaleDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { saleId } = route.params;
  const [menuOpen, setMenuOpen] = useState(false);
  const [ebmOpen, setEbmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  const saleQuery = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => getSaleById(saleId),
  });
  const ebmQuery = useQuery({
    queryKey: ['ebm-receipt', saleId],
    queryFn: () => getEbmReceipt(saleId),
    retry: false,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelSale(saleId, reason.trim()),
    onSuccess: () => {
      setCancelOpen(false);
      setMenuOpen(false);
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      saleQuery.refetch();
    },
    onError: (error: any) => Alert.alert('Cancel failed', error?.response?.data?.error ?? error?.message ?? 'Please try again.'),
  });
  const reprintMutation = useMutation({
    mutationFn: () => reprintSaleReceipt(saleId),
    onSuccess: (updatedSale) => {
      queryClient.setQueryData(['sale', saleId], updatedSale);
      navigation.navigate('PrintShare', {
        mode: 'sale',
        saleId,
        invoiceNumber: updatedSale.invoiceNumber ?? updatedSale.saleNumber,
        totalAmount: updatedSale.totalAmount,
      });
    },
    onError: (error: any) => Alert.alert('Reprint failed', error?.response?.data?.error ?? error?.message ?? 'Please try again.'),
  });

  const sale = saleQuery.data;
  const paymentCode = sale?.salePayments?.[0]?.paymentMethod ?? sale?.paymentType ?? '';
  const paymentLabel = PAYMENT_LABELS[paymentCode] ?? paymentCode.replace(/_/g, ' ');
  const vat = Number(sale?.vatAmount ?? sale?.saleItems?.reduce((sum, item) => sum + Number(item.taxAmount ?? 0), 0) ?? 0);
  const discount = Number(sale?.saleItems?.reduce((sum, item) => sum + Number(item.discount ?? 0), 0) ?? 0);
  const taxableSubtotal = Number(sale?.taxableAmount ?? Math.max(0, Number(sale?.totalAmount ?? 0) - vat));
  const invoice = sale?.invoiceNumber ?? sale?.saleNumber ?? `#${saleId}`;
  const submitted = ebmQuery.data?.status === 'success';
  const statusLabel = sale?.status === 'CANCELLED'
    ? 'Cancelled'
    : sale?.status === 'REFUNDED'
      ? 'Refunded'
      : submitted
        ? 'Submitted'
        : sale?.status === 'COMPLETED'
          ? 'Completed'
          : sale?.status ?? 'Pending';

  const confirmCancel = () => {
    if (reason.trim().length < 5) {
      Alert.alert('Reason required', 'Enter at least five characters explaining the cancellation.');
      return;
    }
    cancelMutation.mutate();
  };

  const header = (
    <View className="h-[76px] flex-row items-center px-5">
      <Pressable onPress={() => navigation.goBack()} className="mr-6 h-11 w-11 items-center justify-center" hitSlop={10}>
        <Ionicons name="arrow-back" size={30} color="#fff" />
      </Pressable>
      <Text className="flex-1 text-[22px] font-bold text-white">Invoice Details</Text>
      <Pressable onPress={() => setMenuOpen(true)} className="h-11 w-11 items-center justify-center" hitSlop={10}>
        <Ionicons name="ellipsis-vertical" size={27} color="#fff" />
      </Pressable>
    </View>
  );

  if (saleQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
        {header}
        <View className="flex-1 items-center justify-center bg-[#F8F9F8]"><ActivityIndicator size="large" color={colors.brand.DEFAULT} /></View>
      </SafeAreaView>
    );
  }

  if (saleQuery.isError || !sale) {
    return (
      <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
        {header}
        <Pressable onPress={() => saleQuery.refetch()} className="flex-1 items-center justify-center bg-[#F8F9F8] px-8">
          <Ionicons name="alert-circle-outline" size={42} color={colors.text.muted} />
          <Text className="mt-3 text-[15px] font-semibold text-gray-700">Invoice not found</Text>
          <Text className="mt-1 text-[12px] text-gray-500">Tap to retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      {header}
      <View className="flex-1 bg-[#F8F9F8]">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <View className="rounded-xl border border-gray-100 bg-white p-4" style={{ shadowColor: '#0B241A', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            <View className="flex-row items-start justify-between border-b border-gray-200 pb-4">
              <View>
                <Text className="text-[21px] font-extrabold text-gray-950">{invoice}</Text>
                <View className={`mt-2 self-start rounded-md px-2.5 py-1 ${statusLabel === 'Cancelled' ? 'bg-red-50' : statusLabel === 'Refunded' ? 'bg-amber-50' : 'bg-green-50'}`}>
                  <Text className={`text-[12px] font-semibold ${statusLabel === 'Cancelled' ? 'text-red-600' : statusLabel === 'Refunded' ? 'text-amber-700' : 'text-green-700'}`}>{statusLabel}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-[13px] text-gray-600">Total</Text>
                <Text className="mt-2 text-[21px] font-extrabold text-green-600">{amount(sale.totalAmount)}</Text>
              </View>
            </View>

            <View className="pt-3">
              <InformationRow label="Date" value={new Date(sale.createdAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
              <InformationRow label="Customer" value={sale.customer?.name ?? 'Walk-in Customer'} />
              <InformationRow label="TIN" value={sale.customer?.TIN || '—'} />
              <InformationRow label="Total" value={amount(sale.totalAmount)} />
              <InformationRow label="Payment" value={paymentLabel || '—'} />
            </View>

            <View className="mt-3 flex-row" style={{ gap: 10 }}>
              <Pressable onPress={() => setEbmOpen(true)} className="min-h-[48px] flex-1 flex-row items-center justify-center rounded-lg border border-brand-dark bg-white">
                <Ionicons name="receipt-outline" size={20} color={colors.brand.dark} />
                <Text className="ml-2 text-[14px] font-semibold text-brand-dark">View EBM</Text>
              </Pressable>
              <Pressable
                onPress={() => reprintMutation.mutate()}
                disabled={reprintMutation.isPending}
                className="min-h-[48px] flex-1 flex-row items-center justify-center rounded-lg bg-brand disabled:opacity-50"
              >
                {reprintMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="print-outline" size={20} color="#fff" />}
                <Text className="ml-2 text-[14px] font-semibold text-white">{reprintMutation.isPending ? 'Preparing…' : 'Reprint'}</Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
            <Text className="text-[17px] font-bold text-gray-950">Items</Text>
            <View className="mt-3 flex-row border-y border-gray-200 py-2">
              <Text className="flex-1 text-[13px] text-gray-600">Item</Text>
              <Text className="w-12 text-center text-[13px] text-gray-600">Qty</Text>
              <Text className="w-24 text-right text-[13px] text-gray-600">Amount</Text>
            </View>

            {(sale.saleItems ?? []).map((item) => (
              <View key={item.id} className="min-h-[76px] flex-row items-center border-b border-gray-200 py-3">
                <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-brand-light">
                  {item.product?.imageUrl ? (
                    <Image source={{ uri: normalizeImageUrl(item.product.imageUrl) }} className="h-full w-full" resizeMode="contain" />
                  ) : (
                    <Text className="text-[16px] font-bold text-brand-dark">{(item.product?.name ?? item.serviceName ?? 'I').charAt(0)}</Text>
                  )}
                </View>
                <View className="ml-3 flex-1">
                  <Text numberOfLines={2} className="text-[14px] font-semibold text-gray-950">{item.product?.name ?? item.serviceName ?? `Item #${item.productId}`}</Text>
                  <Text className="mt-1 text-[12px] text-gray-600">{item.quantity} {item.product?.measurementUnit ?? 'Pc'}</Text>
                </View>
                <Text className="w-12 text-center text-[14px] text-gray-950">{item.quantity}</Text>
                <Text className="w-24 text-right text-[14px] font-medium text-gray-950">{amount(item.totalPrice)}</Text>
              </View>
            ))}

            <View className="pt-2">
              <InformationRow label="Subtotal" value={amount(taxableSubtotal)} />
              <InformationRow label="Discount" value={amount(discount)} />
              <InformationRow label={vat > 0 ? `Tax (${Math.max(...(sale.saleItems ?? []).map((item) => Number(item.taxRate ?? 0)), 0)}%)` : 'Tax'} value={amount(vat)} />
              <View className="mt-1 flex-row items-center justify-between border-t border-gray-200 pt-3">
                <Text className="text-[15px] font-bold text-gray-950">Total</Text>
                <Text className="text-[16px] font-extrabold text-green-600">{amount(sale.totalAmount)}</Text>
              </View>
            </View>
          </View>

          <View className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
            <Text className="mb-2 text-[17px] font-bold text-gray-950">Customer Information</Text>
            <InformationRow label="Name" value={sale.customer?.name ?? 'Walk-in Customer'} />
            <InformationRow label="Phone" value={sale.customer?.phone || '—'} />
            <InformationRow label="TIN" value={sale.customer?.TIN || '—'} />
            <InformationRow label="Email" value={sale.customer?.email || '—'} />
          </View>
        </ScrollView>
      </View>

      <View className="flex-row border-t border-gray-200 bg-white" style={{ height: 58 + Math.max(insets.bottom, 8), paddingBottom: Math.max(insets.bottom, 8) }}>
        {bottomItems.map((item) => {
          const active = item.key === 'Sales';
          const color = active ? colors.brand.DEFAULT : '#777984';
          return (
            <Pressable key={item.key} onPress={() => navigation.navigate('AppTabs', { screen: item.key })} className="flex-1 items-center justify-center pt-2">
              <Ionicons name={item.icon} size={23} color={color} />
              <Text className="mt-1 text-[11px] font-medium" style={{ color }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable className="flex-1 items-end bg-black/20 px-5 pt-24" onPress={() => setMenuOpen(false)}>
          <Pressable className="w-52 rounded-xl bg-white p-2" onPress={(event) => event.stopPropagation()}>
            <Pressable onPress={() => { setMenuOpen(false); navigation.navigate('SelectReturnItems', { saleId }); }} className="flex-row items-center rounded-lg px-3 py-3">
              <Ionicons name="return-down-back-outline" size={20} color={colors.brand.dark} />
              <Text className="ml-3 text-[14px] font-medium text-gray-950">Return / Refund</Text>
            </Pressable>
            {sale.status === 'COMPLETED' ? (
              <Pressable onPress={() => { setMenuOpen(false); setCancelOpen(true); }} className="flex-row items-center rounded-lg px-3 py-3">
                <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                <Text className="ml-3 text-[14px] font-medium text-red-600">Cancel sale</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={ebmOpen} transparent animationType="fade" onRequestClose={() => setEbmOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setEbmOpen(false)}>
          <Pressable className="rounded-t-[24px] bg-white px-5 pb-10 pt-5" onPress={(event) => event.stopPropagation()}>
            <View className="mb-5 h-1 w-10 self-center rounded-full bg-gray-300" />
            <Text className="text-[19px] font-bold text-gray-950">EBM Receipt</Text>
            {ebmQuery.isLoading ? (
              <View className="items-center py-12"><ActivityIndicator color={colors.brand.DEFAULT} /></View>
            ) : submitted ? (
              <View className="mt-4 rounded-xl bg-[#F7FBF8] px-4 py-2">
                <InformationRow label="Status" value="Submitted" />
                <InformationRow label="EBM Invoice" value={ebmQuery.data?.ebm?.ebmInvoiceNumber || invoice} />
                <InformationRow label="SDC ID" value={ebmQuery.data?.ebm?.sdcId || '—'} />
                <InformationRow label="MRC Number" value={ebmQuery.data?.ebm?.mrcNo || '—'} />
                <InformationRow label="Receipt Number" value={String(ebmQuery.data?.ebm?.sdcRcptNo ?? '—')} />
              </View>
            ) : (
              <View className="items-center py-10">
                <Ionicons name="time-outline" size={38} color={colors.warning} />
                <Text className="mt-3 text-[15px] font-semibold text-gray-800">EBM receipt is still processing</Text>
                <Pressable onPress={() => ebmQuery.refetch()} className="mt-4 rounded-lg bg-brand px-5 py-3">
                  <Text className="text-[13px] font-semibold text-white">Check Again</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={cancelOpen} transparent animationType="fade" onRequestClose={() => setCancelOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={() => setCancelOpen(false)} />
          <View className="rounded-t-[24px] bg-white p-6">
            <Text className="text-[19px] font-bold text-gray-950">Cancel this sale?</Text>
            <Text className="mt-2 text-[13px] leading-5 text-gray-600">Stock will be restored and the invoice will be voided through the backend.</Text>
            <Text className="mb-2 mt-5 text-[13px] font-semibold text-gray-700">Reason *</Text>
            <TextInput value={reason} onChangeText={setReason} placeholder="Why are you cancelling this sale?" multiline className="min-h-[80px] rounded-xl border border-gray-200 px-4 py-3 text-[15px]" />
            <View className="mt-5 flex-row" style={{ gap: 10 }}>
              <Pressable onPress={() => setCancelOpen(false)} className="min-h-[50px] flex-1 items-center justify-center rounded-xl bg-gray-100"><Text className="font-semibold text-gray-700">Keep Sale</Text></Pressable>
              <Pressable onPress={confirmCancel} disabled={cancelMutation.isPending} className="min-h-[50px] flex-1 items-center justify-center rounded-xl bg-red-600 disabled:opacity-50"><Text className="font-semibold text-white">{cancelMutation.isPending ? 'Cancelling…' : 'Cancel Sale'}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
