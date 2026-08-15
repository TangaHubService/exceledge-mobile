import { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { AppTabParamList } from '../../navigation/AppTabs';
import { getSales } from '../../api/sales';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Sales'>,
  NativeStackNavigationProp<RootStackParamList>
>;
type DateFilter = 'ALL' | 'TODAY' | 'WEEK';

const FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'TODAY', label: 'Today' },
  { key: 'WEEK', label: 'This Week' },
];

function localDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateRange(filter: DateFilter): { startDate?: string; endDate?: string } {
  if (filter === 'ALL') return {};
  const today = new Date();
  if (filter === 'TODAY') {
    const value = localDateString(today);
    return { startDate: value, endDate: value };
  }
  const monday = new Date(today);
  const day = today.getDay();
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  return { startDate: localDateString(monday), endDate: localDateString(today) };
}

function historyDate(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return `Today - ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday - ${time}`;
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} - ${time}`;
}

export default function SalesHistoryScreen() {
  const navigation = useNavigation<Nav>();
  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const [filter, setFilter] = useState<DateFilter>('ALL');
  const [menuOpen, setMenuOpen] = useState(false);
  const range = useMemo(() => dateRange(filter), [filter]);

  const salesQuery = useQuery({
    queryKey: ['sales', 'history', filter, activeBranchId],
    queryFn: () => getSales({ ...range, branchId: activeBranchId, limit: 100, page: 1 }),
  });

  useFocusEffect(useCallback(() => {
    salesQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, activeBranchId]));

  const sales = salesQuery.data?.data ?? [];
  const formattedAmount = (amount: number) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(amount))} RWF`;

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="h-[76px] flex-row items-center px-5">
        <Pressable onPress={() => navigation.navigate('Home')} className="mr-6 h-11 w-11 items-center justify-center" hitSlop={10}>
          <Ionicons name="arrow-back" size={30} color="#fff" />
        </Pressable>
        <Text className="flex-1 text-[22px] font-bold text-white">Sales History</Text>
        <Pressable onPress={() => setMenuOpen(true)} className="h-11 w-11 items-center justify-center" hitSlop={10}>
          <Ionicons name="ellipsis-vertical" size={27} color="#fff" />
        </Pressable>
      </View>

      <View className="flex-1 bg-[#F8F9F8] px-4 pt-4">
        <View className="rounded-xl border border-gray-100 bg-white p-2" style={{ shadowColor: '#0B241A', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View className="min-h-[48px] flex-row overflow-hidden rounded-lg border border-gray-200">
            {FILTERS.map((item, index) => {
              const selected = item.key === filter;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setFilter(item.key)}
                  className={`flex-1 items-center justify-center ${selected ? 'bg-brand' : 'bg-white'} ${index > 0 ? 'border-l border-gray-200' : ''}`}
                >
                  <Text className={`text-[15px] font-medium ${selected ? 'text-white' : 'text-gray-950'}`}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {salesQuery.isLoading ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color={colors.brand.DEFAULT} /></View>
        ) : salesQuery.isError ? (
          <Pressable onPress={() => salesQuery.refetch()} className="flex-1 items-center justify-center px-8">
            <Ionicons name="cloud-offline-outline" size={42} color={colors.text.muted} />
            <Text className="mt-3 text-[15px] font-semibold text-gray-700">Could not load sales</Text>
            <Text className="mt-1 text-[12px] text-gray-500">Tap to retry</Text>
          </Pressable>
        ) : (
          <FlatList
            className="mt-4 flex-1 overflow-hidden rounded-xl border border-gray-100 bg-white"
            data={sales}
            keyExtractor={(sale) => String(sale.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={sales.length === 0 ? { flexGrow: 1 } : { paddingHorizontal: 16, paddingBottom: 2 }}
            refreshControl={<RefreshControl refreshing={salesQuery.isRefetching} onRefresh={salesQuery.refetch} tintColor={colors.brand.DEFAULT} />}
            ListEmptyComponent={(
              <View className="flex-1 items-center justify-center py-20">
                <Ionicons name="receipt-outline" size={42} color={colors.text.muted} />
                <Text className="mt-3 text-[15px] font-semibold text-gray-700">No sales found</Text>
                <Text className="mt-1 text-[12px] text-gray-500">Sales for this period will appear here.</Text>
              </View>
            )}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => navigation.navigate('SaleDetail', { saleId: item.id })}
                className={`min-h-[86px] flex-row items-center ${index > 0 ? 'border-t border-gray-200' : ''}`}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <View className="flex-1">
                  <Text className="text-[17px] font-bold text-gray-950">{item.invoiceNumber ?? item.saleNumber}</Text>
                  <Text className="mt-2 text-[14px] text-gray-600">{historyDate(item.createdAt)}</Text>
                </View>
                <Text className={`text-[17px] font-bold ${item.status === 'CANCELLED' ? 'text-red-600' : 'text-green-600'}`}>
                  {formattedAmount(item.totalAmount)}
                </Text>
              </Pressable>
            )}
          />
        )}
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable className="flex-1 items-end bg-black/20 px-5 pt-24" onPress={() => setMenuOpen(false)}>
          <Pressable className="w-48 rounded-xl bg-white p-2" onPress={(event) => event.stopPropagation()}>
            <Pressable onPress={() => { setMenuOpen(false); salesQuery.refetch(); }} className="flex-row items-center rounded-lg px-3 py-3">
              <Ionicons name="refresh-outline" size={20} color={colors.brand.dark} />
              <Text className="ml-3 text-[14px] font-medium text-gray-950">Refresh sales</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
