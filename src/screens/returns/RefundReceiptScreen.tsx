import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getInvoicePdfFile, getSaleById } from '../../api/sales';
import { ReferenceBottomBar, ReferenceHeader, type ReferenceTab } from '../../components/ReferenceChrome';
import { colors } from '../../theme';
import { toast } from '../../utils/toast';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'RefundReceipt'>;

function money(value: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Math.abs(Number(value || 0)))} RWF`;
}
function ReceiptRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return <View className="min-h-[66px] flex-row items-center justify-between border-t border-gray-200"><Text className="text-[16px] font-semibold text-[#606777]">{label}</Text><Text numberOfLines={2} className={`ml-6 flex-1 text-right text-[16px] font-bold ${green ? 'text-green-600' : 'text-gray-950'}`}>{value}</Text></View>;
}

export default function RefundReceiptScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { saleId, invoiceNumber, totalAmount, action } = route.params;
  const saleQuery = useQuery({ queryKey: ['sale', saleId], queryFn: () => getSaleById(saleId) });
  const actionHandled = useRef(false);
  const sale = saleQuery.data;
  const receiptNumber = sale?.invoiceNumber ?? invoiceNumber ?? sale?.saleNumber ?? `RR-${String(saleId).padStart(6, '0')}`;
  const originalInvoice = sale?.originalSale?.invoiceNumber ?? sale?.originalSale?.saleNumber ?? (sale?.originalSaleId ? `Sale #${sale.originalSaleId}` : '—');
  const amount = Math.abs(Number(sale?.totalAmount ?? totalAmount));
  const method = sale?.paymentType === 'CASH' ? 'Cash' : (sale?.paymentType ?? 'Cash').replace(/_/g, ' ');
  const date = sale?.createdAt ? new Date(sale.createdAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  const customer = sale?.customer?.name ?? 'Walk-in Customer';

  const print = async () => {
    try {
      const pdf = await getInvoicePdfFile(saleId, receiptNumber);
      await Print.printAsync({ uri: pdf.uri });
    }
    catch (error: any) { toast.error('Print failed', error?.message ?? 'Could not open the print dialog.'); }
  };
  const share = async () => {
    try {
      const pdf = await getInvoicePdfFile(saleId, receiptNumber);
      if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
      await Sharing.shareAsync(pdf.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: `Save or share ${receiptNumber}.pdf`,
      });
    } catch (error: any) { toast.error('Share failed', error?.message ?? 'Could not share this receipt.'); }
  };

  useEffect(() => {
    if (!sale || !action || actionHandled.current) return;
    actionHandled.current = true;
    const timer = setTimeout(() => { if (action === 'print') print(); else share(); }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, sale]);

  const goTab = (tab: ReferenceTab) => navigation.navigate('AppTabs', { screen: tab });
  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <ReferenceHeader title="Refund Receipt" onBack={() => navigation.goBack()} />
      <View className="flex-1 bg-[#F8F9F8] p-4">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="flex-1 items-center rounded-xl border border-gray-100 bg-white px-5 pb-6 pt-10">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-brand-light"><Ionicons name="receipt-outline" size={43} color={colors.brand.dark} /></View>
            <Text className="mt-6 text-[23px] font-extrabold text-gray-950">REFUND RECEIPT</Text>
            <Text className="mt-2 text-[22px] font-extrabold text-green-700">{receiptNumber}</Text>
            <Text className="mt-2 text-[17px] font-semibold text-[#606777]">{originalInvoice}</Text>
            <View className="mt-6 w-full">
              <ReceiptRow label="Date" value={date} />
              <ReceiptRow label="Customer" value={customer} />
              <ReceiptRow label="Refund Amount" value={money(amount)} green />
              <ReceiptRow label="Method" value={method} />
            </View>
            <View className="mt-7 h-12 w-12 items-center justify-center rounded-full bg-brand-light"><Ionicons name="checkmark" size={28} color={colors.brand.dark} /></View>
            <Text className="mt-4 text-[19px] font-extrabold text-gray-950">Thank you!</Text>
            <Text className="mt-2 text-center text-[14px] text-[#606777]">Your refund has been processed successfully.</Text>
            <View className="flex-1" />
            <View className="mt-8 w-full flex-row" style={{ gap: 14 }}>
              <Pressable onPress={print} className="min-h-[56px] flex-1 flex-row items-center justify-center rounded-xl border border-brand-dark bg-white"><Ionicons name="print-outline" size={24} color={colors.brand.dark} /><Text className="ml-3 text-[17px] font-bold text-brand-dark">Print</Text></Pressable>
              <Pressable onPress={share} className="min-h-[56px] flex-1 flex-row items-center justify-center rounded-xl bg-brand"><Ionicons name="share-social-outline" size={24} color="#fff" /><Text className="ml-3 text-[17px] font-bold text-white">Share</Text></Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
      <ReferenceBottomBar active="Home" onNavigate={goTab} />
    </SafeAreaView>
  );
}
