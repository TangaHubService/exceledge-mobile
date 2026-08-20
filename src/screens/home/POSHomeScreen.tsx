import { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import type { AppTabParamList } from '../../navigation/AppTabs';
import { useAuthStore } from '../../store/authStore';
import { getDashboardNotifications, getDashboardOverview } from '../../api/dashboard';
import type { DashboardPreset, DashboardNotification } from '../../api/dashboard';
import { colors } from '../../theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const PERIODS: { key: DashboardPreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'this_year', label: 'This Year' },
];

const NOTIFICATIONS_READ_KEY = 'exceledge_notifications_read';

function notificationKey(notification: DashboardNotification): string {
  return `${notification.type}|${notification.title}|${notification.time}`;
}

function formatNumber(value: number, currency?: string): string {
  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value || 0));
  return currency ? `${formatted} ${currency}` : formatted;
}

function SummaryCard({
  label,
  value,
  subtext,
  icon,
  color,
  background,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
}) {
  return (
    <View
      className="min-h-[114px] flex-1 rounded-xl border border-gray-100 bg-white p-3"
      style={{ shadowColor: '#0B241A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}
    >
      <View className="flex-row items-center">
        <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: background }}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text numberOfLines={1} className="ml-3 flex-1 text-[13px] text-gray-600">{label}</Text>
      </View>
      <Text numberOfLines={1} className="mt-2 text-[18px] font-bold" style={{ color }}>{value}</Text>
      <View className="mt-2 flex-row items-center">
        <Ionicons name="arrow-up" size={13} color={colors.success} />
        <Text numberOfLines={1} className="ml-1 flex-1 text-[11px] text-gray-600">{subtext}</Text>
      </View>
    </View>
  );
}

export default function POSHomeScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((state) => state.user);
  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const [period, setPeriod] = useState<DashboardPreset>('this_month');
  const [periodOpen, setPeriodOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [readKeys, setReadKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATIONS_READ_KEY)
      .then((raw) => {
        if (raw) setReadKeys(new Set(JSON.parse(raw) as string[]));
      })
      .catch(() => {});
  }, []);

  const markRead = useCallback((notification: DashboardNotification) => {
    const key = notificationKey(notification);
    setReadKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      AsyncStorage.setItem(NOTIFICATIONS_READ_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview', period, activeBranchId],
    queryFn: () => getDashboardOverview(period, activeBranchId),
  });
  const notificationsQuery = useQuery({
    queryKey: ['dashboard-notifications', activeBranchId],
    queryFn: () => getDashboardNotifications(activeBranchId),
  });

  const data = overviewQuery.data;
  const currency = data?.currency ?? 'RWF';
  const summary = {
    totalSales: data?.summary?.totalSales ?? data?.kpis?.totalSales ?? { value: 0, changePercentage: 0 },
    totalPurchases: data?.summary?.totalPurchases ?? { value: 0, changePercentage: 0 },
    totalProducts: data?.summary?.totalProducts ?? { value: 0, newCount: 0 },
    totalCustomers: data?.summary?.totalCustomers ?? { value: 0, newCount: 0 },
  };
  const notifications = notificationsQuery.data ?? [];
  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !readKeys.has(notificationKey(notification))),
    [notifications, readKeys],
  );
  const openNotification = useCallback((notification: DashboardNotification) => {
    markRead(notification);
    setNotificationsOpen(false);
    navigation.navigate('Products');
  }, [markRead, navigation]);
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'User';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const periodLabel = PERIODS.find((item) => item.key === period)?.label ?? 'This Month';
  const role = user?.role === 'ADMIN'
    ? 'Administrator'
    : (user?.role ?? 'User').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

  const recentTransactions = useMemo(() => {
    const transactions = data?.recentTransactions ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return transactions;
    return transactions.filter((transaction) => transaction.number.toLowerCase().includes(term));
  }, [data?.recentTransactions, search]);

  const refresh = () => Promise.all([overviewQuery.refetch(), notificationsQuery.refetch()]);

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="px-5 pb-5 pt-3">
        <View className="flex-row items-center">
          <View className="flex-1">
            <Text className="text-[16px] text-white">{greeting},</Text>
            <Text className="mt-1 text-[21px] font-bold text-white">{firstName} 👋</Text>
            <Text className="mt-1 text-[12px] text-white/70">{role}</Text>
          </View>
          <Pressable onPress={() => setNotificationsOpen(true)} className="mr-4 h-11 w-11 items-center justify-center">
            <Ionicons name="notifications-outline" size={27} color="#fff" />
            {unreadNotifications.length > 0 ? (
              <View className="absolute right-0 top-0 min-w-[19px] items-center rounded-full bg-red-500 px-1 py-0.5">
                <Text className="text-[10px] font-bold text-white">{Math.min(unreadNotifications.length, 99)}</Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable onPress={() => navigation.navigate('More')} className="h-12 w-12 items-center justify-center rounded-xl bg-white/95">
            <Text className="text-[19px] font-extrabold text-brand-dark">{firstName.charAt(0).toUpperCase()}</Text>
            <View className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
          </Pressable>
        </View>

        <View className="mt-5 min-h-[54px] flex-row items-center rounded-xl bg-white px-4">
          <Ionicons name="search" size={23} color="#8B8D96" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search anything..."
            placeholderTextColor="#999BA4"
            className="ml-3 flex-1 py-3 text-[15px] text-gray-950"
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color="#8B8D96" />
            </Pressable>
          ) : (
            <Ionicons name="qr-code-outline" size={23} color="#777984" />
          )}
        </View>
      </View>

      <View className="flex-1 overflow-hidden rounded-t-[18px] bg-white">
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={overviewQuery.isRefetching} onRefresh={refresh} tintColor={colors.brand.DEFAULT} />}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-[18px] font-semibold text-gray-950">Summary Overview</Text>
            <Pressable onPress={() => setPeriodOpen(true)} className="flex-row items-center py-2 pl-3">
              <Text className="text-[13px] text-gray-600">{periodLabel}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.text.secondary} style={{ marginLeft: 5 }} />
            </Pressable>
          </View>

          {overviewQuery.isLoading ? (
            <View className="h-[248px] items-center justify-center"><ActivityIndicator color={colors.brand.DEFAULT} /></View>
          ) : overviewQuery.isError ? (
            <Pressable onPress={() => overviewQuery.refetch()} className="my-8 items-center rounded-xl bg-red-50 px-5 py-6">
              <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
              <Text className="mt-2 text-[14px] font-semibold text-red-600">Could not load dashboard</Text>
              <Text className="mt-1 text-[12px] text-red-500">Tap to retry</Text>
            </Pressable>
          ) : (
            <>
              <View className="mt-3 flex-row" style={{ gap: 10 }}>
                <SummaryCard
                  label="Total Sales"
                  value={formatNumber(summary.totalSales.value ?? 0, currency)}
                  subtext={`${summary.totalSales.changePercentage ?? 0}% from last period`}
                  icon="bag-handle-outline"
                  color="#087A42"
                  background="#E9F6EE"
                />
                <SummaryCard
                  label="Total Purchases"
                  value={formatNumber(summary.totalPurchases.value ?? 0, currency)}
                  subtext={`${summary.totalPurchases.changePercentage ?? 0}% from last period`}
                  icon="cart-outline"
                  color="#126CE5"
                  background="#EAF2FD"
                />
              </View>
              <View className="mt-3 flex-row" style={{ gap: 10 }}>
                <SummaryCard
                  label="Total Products"
                  value={formatNumber(summary.totalProducts.value ?? 0)}
                  subtext={`${summary.totalProducts.newCount ?? 0} new this period`}
                  icon="cube-outline"
                  color="#D98200"
                  background="#FFF4E4"
                />
                <SummaryCard
                  label="Total Customers"
                  value={formatNumber(summary.totalCustomers.value ?? 0)}
                  subtext={`${summary.totalCustomers.newCount ?? 0} new this period`}
                  icon="people-outline"
                  color="#7A31CE"
                  background="#F4E9FC"
                />
              </View>
            </>
          )}

          <View className="mb-3 mt-5 flex-row items-center justify-between">
            <Text className="text-[18px] font-semibold text-gray-950">Recent Transactions</Text>
            <Pressable onPress={() => navigation.navigate('Sales')} className="flex-row items-center py-2 pl-3">
              <Text className="text-[13px] font-medium text-brand-dark">View All</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.brand.dark} />
            </Pressable>
          </View>

          <View className="overflow-hidden rounded-xl border border-gray-100 bg-white px-4">
            {recentTransactions.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="receipt-outline" size={30} color={colors.text.muted} />
                <Text className="mt-2 text-[13px] text-gray-500">No transactions found</Text>
              </View>
            ) : recentTransactions.map((transaction, index) => (
              <Pressable
                key={transaction.id}
                onPress={() => navigation.navigate('SaleDetail', { saleId: transaction.id })}
                className={`min-h-[68px] flex-row items-center ${index > 0 ? 'border-t border-gray-100' : ''}`}
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E9F6EE]">
                  <Ionicons name="cart-outline" size={20} color="#087A42" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[14px] font-bold text-gray-950">{transaction.number}</Text>
                  <Text className="mt-1 text-[11px] text-gray-500">
                    {new Date(transaction.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-[14px] font-bold text-brand-dark">{formatNumber(transaction.totalAmount, currency)}</Text>
                  <View className="mt-1 rounded-md bg-green-50 px-2 py-1">
                    <Text className="text-[10px] font-medium text-green-700">{transaction.status === 'COMPLETED' ? 'Completed' : transaction.status}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <Modal visible={periodOpen} transparent animationType="fade" onRequestClose={() => setPeriodOpen(false)}>
        <Pressable className="flex-1 justify-center bg-black/40 px-8" onPress={() => setPeriodOpen(false)}>
          <Pressable className="rounded-2xl bg-white p-5" onPress={(event) => event.stopPropagation()}>
            <Text className="mb-2 text-[18px] font-bold text-gray-950">Dashboard Period</Text>
            {PERIODS.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => { setPeriod(item.key); setPeriodOpen(false); }}
                className="flex-row items-center border-b border-gray-100 py-4"
              >
                <Text className="flex-1 text-[15px] text-gray-950">{item.label}</Text>
                {item.key === period ? <Ionicons name="checkmark-circle" size={22} color={colors.brand.DEFAULT} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={notificationsOpen} transparent animationType="fade" onRequestClose={() => setNotificationsOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setNotificationsOpen(false)}>
          <Pressable className="max-h-[72%] rounded-t-[24px] bg-white px-5 pb-10 pt-5" onPress={(event) => event.stopPropagation()}>
            <View className="mb-5 h-1 w-10 self-center rounded-full bg-gray-300" />
            <Text className="mb-3 text-[19px] font-bold text-gray-950">Notifications</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <Text className="py-10 text-center text-[14px] text-gray-500">No inventory alerts</Text>
              ) : notifications.map((notification, index) => {
                const read = readKeys.has(notificationKey(notification));
                return (
                  <Pressable
                    key={`${notification.title}-${index}`}
                    onPress={() => openNotification(notification)}
                    className={`border-b border-gray-100 py-4 ${read ? 'opacity-55' : ''}`}
                  >
                    <View className="flex-row items-start">
                      <View className="flex-1 pr-2">
                        <Text className="text-[14px] font-semibold text-gray-950">{notification.title}</Text>
                        <Text className="mt-1 text-[12px] leading-5 text-gray-600">{notification.message}</Text>
                      </View>
                      {!read ? (
                        <View className="mt-1.5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.brand.DEFAULT }} />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
