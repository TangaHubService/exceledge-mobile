import { useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getSaleById, getInvoice } from '../../api/sales';
import { API_URL } from '../../api/client';
import { usePrinterStore } from '../../store/printerStore';
import { useIsOffline } from '../../components/OfflineBanner';
import { colors } from '../../theme';
import { toast } from '../../utils/toast';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SaleSuccess'>;

const paymentLabels: Record<string, string> = {
  CASH: 'Cash',
  MOBILE_MONEY: 'Mobile Money',
  CREDIT_CARD: 'Bank Card',
  CARD: 'Bank Card',
  BANK: 'Bank Transfer',
  DEBT: 'Credit Sale',
  INSURANCE: 'Insurance',
  MIXED: 'Mixed Payment',
  MTN_MOMO: 'Mobile Money (MTN MoMo)',
  AIRTEL_MONEY: 'Mobile Money (Airtel Money)',
};

const providerLabels: Record<string, string> = {
  MTN_MOMO: 'MTN MoMo',
  AIRTEL_MONEY: 'Airtel Money',
  PAYPACK: 'Paypack',
};

function ReceiptRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="min-h-[52px] flex-row items-center border-t border-gray-200">
      <Ionicons name={icon} size={21} color={colors.brand.dark} />
      <Text className="ml-3 text-[14px] text-gray-950">{label}</Text>
      <Text numberOfLines={2} className="ml-4 flex-1 text-right text-[14px] font-medium text-gray-950">{value}</Text>
    </View>
  );
}

export default function SaleSuccessScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { saleId, invoiceNumber, totalAmount } = route.params;
  const saleQuery = useQuery({
    queryKey: ['sale', saleId],
    queryFn: () => getSaleById(saleId),
  });
  const autoPrint = usePrinterStore((s) => s.autoPrintAfterSale);
  const copies = usePrinterStore((s) => s.copies);
  const isOffline = useIsOffline();
  const autoPrinted = useRef(false);

  useEffect(() => {
    if (!autoPrint || autoPrinted.current || isOffline || !saleQuery.data) return;
    let cancelled = false;
    (async () => {
      try {
        const invoiceDocument = await getInvoice(saleId);
        if (cancelled || !invoiceDocument?.renderedHtml) return;
        const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>@page{size:A4 portrait;margin:6mm}html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.rra-invoice .sheet{box-shadow:none!important;border-radius:0!important}</style></head><body>${invoiceDocument.renderedHtml}</body></html>`;
        for (let i = 0; i < copies; i += 1) {
          await Print.printAsync({ html });
        }
      } catch (error: any) {
        toast.warning('Auto-print failed', error?.message ?? 'The receipt could not be printed.');
      }
    })();
    autoPrinted.current = true;
    return () => {
      cancelled = true;
    };
  }, [autoPrint, copies, isOffline, saleId, saleQuery.data]);

  const sale = saleQuery.data;
  const payment = sale?.salePayments?.[0];
  const paymentMethodCode = payment?.paymentMethod ?? sale?.paymentType ?? 'CASH';
  const isMobileMoney = ['MTN_MOMO', 'AIRTEL_MONEY', 'PAYPACK', 'MOBILE_MONEY'].includes(paymentMethodCode)
    || sale?.paymentType === 'MOBILE_MONEY';
  const isCredit = sale?.paymentType === 'DEBT';
  const methodLabel = paymentLabels[paymentMethodCode] ?? paymentLabels[sale?.paymentType ?? ''] ?? paymentMethodCode.replace(/_/g, ' ');
  const providerCode = String(payment?.metadata?.provider ?? payment?.paymentMethod ?? '');
  const providerLabel = providerLabels[providerCode] ?? providerCode.replace(/_/g, ' ');
  const phone = String(payment?.metadata?.phone ?? sale?.customer?.phone ?? '—');
  const invoice = sale?.invoiceNumber ?? invoiceNumber ?? sale?.saleNumber ?? `#${saleId}`;
  const reference = payment?.reference || String(payment?.metadata?.customerReference ?? '') || invoice;
  const amount = Number(sale?.totalAmount ?? totalAmount);
  const formattedAmount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount);
  const processedAt = payment?.processedAt ?? sale?.createdAt;
  const formattedDate = processedAt
    ? new Date(processedAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const backHome = () => {
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'AppTabs' }] }));
  };
  const openPrintShare = () => navigation.navigate('PrintShare', {
    mode: 'sale',
    saleId,
    invoiceNumber: invoice,
    totalAmount: amount,
  });

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="h-[76px] flex-row items-center px-6">
        <Pressable onPress={backHome} className="mr-8 h-11 w-11 items-center justify-center" hitSlop={10}>
          <Ionicons name="arrow-back" size={30} color="#fff" />
        </Pressable>
        <Text className="flex-1 text-[22px] font-bold text-white">{isCredit ? 'Sale Successful' : 'Payment Successful'}</Text>
        <Pressable onPress={openPrintShare} className="h-11 w-11 items-center justify-center" hitSlop={10}>
          <Ionicons name="print-outline" size={27} color="#fff" />
        </Pressable>
      </View>

      <View className="flex-1 overflow-hidden rounded-t-[18px] bg-white">
        {saleQuery.isLoading ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand.DEFAULT} /></View>
        ) : saleQuery.isError ? (
          <Pressable onPress={() => saleQuery.refetch()} className="flex-1 items-center justify-center px-8">
            <Ionicons name="cloud-offline-outline" size={42} color={colors.text.muted} />
            <Text className="mt-3 text-center text-[15px] font-semibold text-gray-700">Could not load the finalized receipt</Text>
            <Text className="mt-1 text-[12px] text-gray-500">Tap to retry</Text>
          </Pressable>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 38 }} showsVerticalScrollIndicator={false}>
            <View className="items-center">
              <View className="h-[116px] w-[116px] items-center justify-center rounded-full bg-brand-light">
                <View className="h-[84px] w-[84px] items-center justify-center rounded-full bg-brand">
                  <Ionicons name="checkmark" size={57} color="#fff" />
                </View>
              </View>
              <Text className="mt-4 text-[24px] font-extrabold text-brand-dark">
                {isCredit ? 'Sale Successful!' : 'Payment Successful!'}
              </Text>
              <Text className="mt-2 text-center text-[14px] text-gray-600">
                {isCredit ? 'The credit sale has been recorded successfully.' : 'Your payment has been processed successfully.'}
              </Text>
            </View>

            <View className="mt-6 rounded-xl border border-green-100 bg-[#F7FBF8] px-4 py-4">
              <View className="flex-row items-center justify-between pb-4">
                <View>
                  <Text className="text-[15px] font-medium text-gray-950">{isCredit ? 'Total Recorded' : 'Total Paid'}</Text>
                  <Text className="mt-2 text-[25px] font-extrabold text-brand-dark">{formattedAmount} RWF</Text>
                </View>
                <View className="flex-row items-center rounded-xl bg-brand-light px-3 py-2">
                  <Ionicons name="checkmark-circle" size={20} color={colors.brand.DEFAULT} />
                  <Text className="ml-2 text-[14px] font-semibold text-brand-dark">{isCredit ? 'On Credit' : 'Paid'}</Text>
                </View>
              </View>
              <ReceiptRow icon="calendar-outline" label="Date & Time" value={formattedDate} />
              <ReceiptRow icon="receipt-outline" label="Invoice Number" value={invoice} />
              <ReceiptRow icon={isMobileMoney ? 'phone-portrait-outline' : 'wallet-outline'} label="Payment Method" value={methodLabel} />
              {isMobileMoney ? <ReceiptRow icon="wallet-outline" label="Provider" value={providerLabel} /> : null}
              {isMobileMoney ? <ReceiptRow icon="call-outline" label="Phone Number" value={phone} /> : null}
              <ReceiptRow icon="pricetag-outline" label="Reference" value={reference} />
            </View>

            <View className="mt-5 flex-row rounded-xl border border-gray-200 bg-white px-4 py-4">
              <Ionicons name="shield-checkmark-outline" size={31} color={colors.brand.dark} />
              <View className="ml-3 flex-1">
                <Text className="text-[15px] font-bold text-gray-950">Thank you!</Text>
                <Text className="mt-1 text-[12px] leading-5 text-gray-600">The sale was recorded successfully. Fiscal receipt details are available in the invoice.</Text>
              </View>
            </View>

            <Pressable onPress={openPrintShare} className="mt-5 min-h-[54px] flex-row items-center justify-center rounded-xl bg-brand">
              <Ionicons name="print-outline" size={22} color="#fff" />
              <Text className="ml-3 text-[17px] font-bold text-white">Print Receipt</Text>
            </Pressable>
            <View className="mt-4 flex-row" style={{ gap: 10 }}>
              <Pressable onPress={openPrintShare} className="min-h-[52px] flex-1 flex-row items-center justify-center rounded-xl border border-brand-dark bg-white">
                <Ionicons name="share-social-outline" size={20} color={colors.brand.dark} />
                <Text className="ml-2 text-[14px] font-semibold text-brand-dark">Share Receipt</Text>
              </Pressable>
              <Pressable onPress={backHome} className="min-h-[52px] flex-1 flex-row items-center justify-center rounded-xl border border-brand-dark bg-white">
                <Ionicons name="home-outline" size={20} color={colors.brand.dark} />
                <Text className="ml-2 text-[14px] font-semibold text-brand-dark">Back to Home</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
