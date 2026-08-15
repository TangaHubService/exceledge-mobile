import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getSales } from '../../api/sales';
import { useAuthStore } from '../../store/authStore';
import { ReferenceBottomBar, ReferenceHeader, type ReferenceTab } from '../../components/ReferenceChrome';
import { colors } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DateFilter = 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH';

const dateFilters: Array<[DateFilter, string]> = [
  ['ALL', 'All'], ['TODAY', 'Today'], ['YESTERDAY', 'Yesterday'], ['WEEK', 'This Week'], ['MONTH', 'This Month'],
];

function money(value: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value || 0))} RWF`;
}

function dateLabel(value: string) {
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function matchesDate(value: string, filter: DateFilter) {
  if (filter === 'ALL') return true;
  const date = new Date(value);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === 'TODAY') return date >= startToday;
  if (filter === 'YESTERDAY') {
    const start = new Date(startToday); start.setDate(start.getDate() - 1);
    return date >= start && date < startToday;
  }
  if (filter === 'WEEK') {
    const start = new Date(startToday); start.setDate(start.getDate() - 6);
    return date >= start;
  }
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

export default function StartReturnScreen() {
  const navigation = useNavigation<Nav>();
  const branchId = useAuthStore((s) => s.activeBranchId);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const salesQuery = useQuery({
    queryKey: ['return-sales', branchId, search.trim()],
    queryFn: () => getSales({ status: 'COMPLETED', search: search.trim() || undefined, limit: 50, page: 1, branchId }),
  });
  const sales = useMemo(
    () => (salesQuery.data?.data ?? []).filter((sale) => sale.status === 'COMPLETED' && matchesDate(sale.createdAt, dateFilter)),
    [dateFilter, salesQuery.data?.data]
  );
  const goTab = (tab: ReferenceTab) => navigation.navigate('AppTabs', { screen: tab });

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <ReferenceHeader title="Start Return" onBack={() => navigation.goBack()} right={<Ionicons name="ellipsis-vertical" size={27} color="#fff" />} />
      <View className="flex-1 bg-[#F8F9F8]">
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="rounded-xl border border-gray-100 bg-white p-4">
            <Text className="text-[18px] font-extrabold text-[#132238]">Return Type</Text>
            <View className="mt-4 flex-row" style={{ gap: 10 }}>
              <View className="min-h-[142px] flex-1 rounded-xl border border-brand bg-brand-light p-4">
                <View className="flex-row justify-between">
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-white/70"><Ionicons name="cart-outline" size={24} color={colors.brand.dark} /></View>
                  <Ionicons name="checkmark-circle" size={23} color={colors.brand.dark} />
                </View>
                <Text className="mt-3 text-[16px] font-extrabold text-green-800">Sales Return</Text>
                <Text className="mt-1 text-[13px] leading-5 text-gray-600">Return items sold to customers</Text>
              </View>
              <Pressable
                onPress={() => Alert.alert('Purchase returns', 'Purchase returns are not available in the current backend. Use the web purchase workflow for supplier returns.')}
                className="min-h-[142px] flex-1 rounded-xl border border-gray-200 bg-white p-4"
              >
                <View className="flex-row justify-between">
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-blue-50"><Ionicons name="cart-outline" size={24} color="#2364C7" /></View>
                  <Ionicons name="radio-button-off" size={23} color="#D3D8E1" />
                </View>
                <Text className="mt-3 text-[16px] font-extrabold text-[#132238]">Purchase Return</Text>
                <Text className="mt-1 text-[13px] leading-5 text-gray-600">Return items to suppliers</Text>
              </Pressable>
            </View>
          </View>

          <View className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white">
            <View className="p-4 pb-3">
              <Text className="text-[18px] font-extrabold text-[#132238]">Select Invoice</Text>
              <View className="mt-4 h-[50px] flex-row items-center rounded-xl border border-gray-200 bg-white px-4">
                <Ionicons name="search-outline" size={23} color="#596579" />
                <TextInput value={search} onChangeText={setSearch} placeholder="Search invoice number, customer or phone..." placeholderTextColor="#8D96A6" autoCapitalize="characters" className="ml-3 flex-1 text-[14px]" />
                <View className="h-7 w-px bg-gray-200" />
                <Ionicons name="scan-outline" size={22} color="#31445D" style={{ marginLeft: 12 }} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12 }}>
                {dateFilters.map(([key, label]) => (
                  <Pressable key={key} onPress={() => setDateFilter(key)} className={`h-9 items-center justify-center rounded-full border px-4 ${dateFilter === key ? 'border-brand bg-brand' : 'border-gray-200 bg-white'}`}>
                    <Text className={`text-[13px] font-semibold ${dateFilter === key ? 'text-white' : 'text-gray-600'}`}>{label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {salesQuery.isLoading ? (
              <View className="items-center py-12"><ActivityIndicator color={colors.brand.DEFAULT} /></View>
            ) : salesQuery.isError ? (
              <Pressable onPress={() => salesQuery.refetch()} className="items-center py-12"><Text className="text-[14px] font-semibold text-red-600">Could not load invoices. Tap to retry.</Text></Pressable>
            ) : sales.length === 0 ? (
              <View className="items-center border-t border-gray-100 py-12"><Text className="text-[14px] font-semibold text-gray-600">No refundable invoices found</Text></View>
            ) : sales.map((sale) => (
              <Pressable key={sale.id} onPress={() => navigation.navigate('SelectReturnItems', { saleId: sale.id })} className="min-h-[82px] flex-row items-center border-t border-gray-200 px-4 py-3">
                <View className="flex-1">
                  <Text className="text-[15px] font-extrabold text-gray-950">{sale.invoiceNumber ?? sale.saleNumber}</Text>
                  <Text className="mt-1 text-[13px] text-[#263B58]">{sale.customer?.name ?? 'Walk-in Customer'}</Text>
                  <Text className="mt-1 text-[12px] text-[#506079]">{dateLabel(sale.createdAt)}</Text>
                </View>
                <Text className="text-[15px] font-extrabold text-green-600">{money(sale.totalAmount)}</Text>
                <Ionicons name="chevron-forward" size={21} color="#253A52" style={{ marginLeft: 8 }} />
              </Pressable>
            ))}
          </View>

          <View className="mt-4 flex-row rounded-xl bg-brand-light p-4">
            <Ionicons name="information-circle-outline" size={23} color={colors.brand.dark} />
            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-bold text-[#132238]">How returns work</Text>
              <Text className="mt-1 text-[13px] leading-5 text-[#364861]">Select a completed sales invoice to return all items from the original sale.</Text>
            </View>
          </View>
        </ScrollView>
      </View>
      <ReferenceBottomBar active="More" onNavigate={goTab} />
    </SafeAreaView>
  );
}
