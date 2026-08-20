import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getSaleById } from '../../api/sales';
import { API_URL } from '../../api/client';
import { ReferenceBottomBar, ReferenceHeader, type ReferenceTab } from '../../components/ReferenceChrome';
import { colors } from '../../theme';
import { toast } from '../../utils/toast';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SelectReturnItems'>;

function money(value: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value || 0))} RWF`;
}

function imageUri(value?: string | null) {
  if (!value) return null;
  if (value.startsWith('http') || value.startsWith('data:')) return value;
  return `${API_URL.replace(/\/api$/, '')}${value.startsWith('/') ? value : `/${value}`}`;
}

export default function SelectReturnItemsScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { saleId } = route.params;
  const saleQuery = useQuery({ queryKey: ['sale', saleId], queryFn: () => getSaleById(saleId) });
  const sale = saleQuery.data;
  const goTab = (tab: ReferenceTab) => navigation.navigate('AppTabs', { screen: tab });

  if (saleQuery.isLoading || saleQuery.isError || !sale) {
    return (
      <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
        <ReferenceHeader title="Select Return Items" onBack={() => navigation.goBack()} right={<Ionicons name="ellipsis-vertical" size={27} color="#fff" />} />
        <Pressable onPress={() => saleQuery.isError && saleQuery.refetch()} className="flex-1 items-center justify-center bg-[#F8F9F8] px-8">
          {saleQuery.isLoading ? <Text className="text-[14px] text-gray-600">Loading invoice…</Text> : <Text className="text-center text-[14px] font-semibold text-red-600">Could not load this invoice. Tap to retry.</Text>}
        </Pressable>
      </SafeAreaView>
    );
  }

  const items = sale.saleItems ?? [];
  const total = Number(sale.totalAmount);
  const tax = Number(sale.vatAmount ?? items.reduce((sum, item) => sum + Number(item.taxAmount ?? 0), 0));
  const subtotal = Number(sale.taxableAmount ?? Math.max(0, total - tax));
  const invoice = sale.invoiceNumber ?? sale.saleNumber;
  const locked = () => toast.info('Full invoice return', 'The backend currently requires all items and their full sold quantities to be returned together.');

  const productCell = (item: (typeof items)[number]) => {
    const uri = imageUri(item.product?.imageUrl);
    return (
      <>
        <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-brand-light">
          {uri ? <Image source={{ uri }} className="h-full w-full" resizeMode="contain" /> : <Text className="text-[16px] font-bold text-brand-dark">{(item.product?.name ?? item.serviceName ?? 'I').charAt(0)}</Text>}
        </View>
        <View className="ml-3 flex-1">
          <Text numberOfLines={2} className="text-[14px] font-bold text-[#132238]">{item.product?.name ?? item.serviceName ?? `Item #${item.productId}`}</Text>
          <Text className="mt-1 text-[12px] text-[#506079]">{item.quantity} {item.product?.measurementUnit ?? 'Pc'}</Text>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <ReferenceHeader title="Select Return Items" onBack={() => navigation.goBack()} right={<Ionicons name="ellipsis-vertical" size={27} color="#fff" />} />
      <View className="flex-1 bg-[#F8F9F8]">
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
          <View className="rounded-xl border border-gray-100 bg-white p-4">
            <View className="flex-row items-center">
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-light"><Ionicons name="receipt-outline" size={24} color={colors.brand.dark} /></View>
              <View className="ml-3 flex-1">
                <Text className="text-[17px] font-extrabold text-[#132238]">{invoice}</Text>
                <Text className="mt-1 text-[13px] text-[#263B58]">{sale.customer?.name ?? 'Walk-in Customer'}</Text>
                <Text className="mt-1 text-[12px] text-[#506079]">{new Date(sale.createdAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <View className="items-end"><Text className="text-[17px] font-extrabold text-green-600">{money(total)}</Text><View className="mt-2 rounded-md bg-green-50 px-2 py-1"><Text className="text-[11px] text-green-700">Total Invoice</Text></View></View>
            </View>
          </View>

          <View className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white p-4">
            <Text className="text-[17px] font-extrabold text-[#132238]">Items in Invoice</Text>
            <View className="mt-3 flex-row border-y border-gray-200 py-2"><Text className="flex-1 text-[12px] text-gray-600">Item</Text><Text className="w-10 text-center text-[12px] text-gray-600">Qty</Text><Text className="w-24 text-right text-[12px] text-gray-600">Total</Text></View>
            {items.map((item) => (
              <View key={item.id} className="min-h-[72px] flex-row items-center border-b border-gray-200 py-3">
                {productCell(item)}
                <Text className="w-10 text-center text-[13px] text-[#132238]">{item.quantity}</Text>
                <Text className="w-24 text-right text-[13px] font-medium text-[#132238]">{money(item.totalPrice)}</Text>
              </View>
            ))}
          </View>

          <View className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
            <Text className="text-[17px] font-extrabold text-[#132238]">Select Items to Return</Text>
            <View className="mt-3 flex-row items-center rounded-xl bg-brand-light p-3">
              <Ionicons name="information-circle-outline" size={23} color={colors.brand.dark} />
              <Text className="ml-3 flex-1 text-[13px] leading-5 text-[#364861]">Full-invoice refunds are enabled by your backend. All sold quantities are selected.</Text>
            </View>
            <View className="mt-3 flex-row border-y border-gray-200 py-2"><Text className="flex-1 text-[12px] text-gray-600">Item</Text><Text className="w-[104px] text-center text-[12px] text-gray-600">Return Qty</Text><Text className="w-24 text-right text-[12px] text-gray-600">Return Amount</Text></View>
            {items.map((item) => (
              <View key={item.id} className="min-h-[82px] flex-row items-center border-b border-gray-200 py-3">
                <Ionicons name="checkbox" size={22} color={colors.brand.DEFAULT} />
                <View className="ml-2 flex-1 flex-row items-center">{productCell(item)}</View>
                <Pressable onPress={locked} className="h-10 w-[104px] flex-row items-center justify-around rounded-lg border border-gray-200 bg-gray-50">
                  <Text className="text-[20px] text-gray-400">−</Text><Text className="text-[14px] font-semibold text-[#132238]">{item.quantity}</Text><Text className="text-[20px] text-gray-400">+</Text>
                </Pressable>
                <Text className="ml-2 w-24 text-right text-[13px] font-medium text-[#132238]">{money(item.totalPrice)}</Text>
              </View>
            ))}
          </View>

          <View className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
            <Text className="mb-3 text-[17px] font-extrabold text-[#132238]">Return Summary</Text>
            <View className="flex-row justify-between py-1"><Text className="text-[13px] text-[#31445D]">Subtotal</Text><Text className="text-[13px] text-[#31445D]">{money(subtotal)}</Text></View>
            <View className="flex-row justify-between py-1"><Text className="text-[13px] text-[#31445D]">Tax</Text><Text className="text-[13px] text-[#31445D]">{money(tax)}</Text></View>
            <View className="mt-2 flex-row justify-between border-t border-gray-200 pt-3"><Text className="text-[15px] font-bold text-[#132238]">Total Return Amount</Text><Text className="text-[18px] font-extrabold text-green-600">{money(total)}</Text></View>
          </View>

          <View className="mt-4 flex-row" style={{ gap: 12 }}>
            <Pressable onPress={() => navigation.goBack()} className="h-[50px] flex-1 items-center justify-center rounded-xl border border-brand-dark bg-white"><Text className="text-[15px] font-bold text-brand-dark">Cancel</Text></Pressable>
            <Pressable onPress={() => navigation.navigate('ReturnReason', { saleId })} className="h-[50px] flex-1 items-center justify-center rounded-xl bg-brand"><Text className="text-[15px] font-bold text-white">Continue</Text></Pressable>
          </View>
        </ScrollView>
      </View>
      <ReferenceBottomBar active="More" onNavigate={goTab} />
    </SafeAreaView>
  );
}
