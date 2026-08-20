import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { cancelHeldSale, getHeldSales, resumeHeldSale, type HeldSale } from '../../api/heldSales';
import { API_URL } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { ReferenceBottomBar, ReferenceHeader, type ReferenceTab } from '../../components/ReferenceChrome';
import { colors } from '../../theme';
import { toast } from '../../utils/toast';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Filter = 'ALL' | 'MINE' | 'OTHERS';

function money(value: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value || 0))} RWF`;
}

function imageUri(value?: string | null) {
  if (!value) return null;
  if (value.startsWith('http') || value.startsWith('data:')) return value;
  return `${API_URL.replace(/\/api$/, '')}${value.startsWith('/') ? value : `/${value}`}`;
}

function heldTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function HeldSalesScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const restoreFromHeld = useCartStore((s) => s.restoreFromHeld);
  const userId = useAuthStore((s) => s.user?.id);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [newestFirst, setNewestFirst] = useState(true);

  const query = useQuery({ queryKey: ['heldSales'], queryFn: getHeldSales });
  useFocusEffect(useCallback(() => { query.refetch(); }, [query.refetch]));

  const resumeMutation = useMutation({
    mutationFn: resumeHeldSale,
    onSuccess: (held) => {
      const snapshot = held.customerSnapshot;
      restoreFromHeld(
        held.cartSnapshot ?? [],
        snapshot?.id ? ({ id: snapshot.id, name: snapshot.name ?? 'Walk-in Customer', phone: snapshot.phone, TIN: snapshot.TIN } as any) : null
      );
      queryClient.invalidateQueries({ queryKey: ['heldSales'] });
      navigation.navigate('Cart');
    },
    onError: (error: any) => toast.error('Could not continue', error?.response?.data?.error ?? error?.message ?? 'Please try again.'),
  });
  const cancelMutation = useMutation({
    mutationFn: cancelHeldSale,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['heldSales'] }),
    onError: (error: any) => toast.error('Could not delete', error?.response?.data?.error ?? error?.message ?? 'Please try again.'),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...(query.data ?? [])]
      .filter((item) => filter === 'ALL' || (filter === 'MINE' ? item.user?.id === userId : item.user?.id !== userId))
      .filter((item) => {
        if (!term) return true;
        return [item.reference, item.customerSnapshot?.name, item.customerSnapshot?.TIN, item.user?.name]
          .some((value) => String(value ?? '').toLowerCase().includes(term));
      })
      .sort((a, b) => (newestFirst ? 1 : -1) * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, [filter, newestFirst, query.data, search, userId]);

  const goTab = (tab: ReferenceTab) => navigation.navigate('AppTabs', { screen: tab });
  const confirmDelete = (sale: HeldSale) => Alert.alert(
    'Delete held sale?',
    `${sale.reference} will be permanently removed.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => cancelMutation.mutate(sale.id) },
    ]
  );

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <ReferenceHeader
        title="Held Sales"
        onBack={() => navigation.goBack()}
        right={<Ionicons name="ellipsis-vertical" size={27} color="#fff" />}
      />
      <View className="flex-1 bg-[#F8F9F8]">
        <View className="px-4 pt-4">
          <View className="flex-row" style={{ gap: 10 }}>
            <View className="h-[50px] flex-1 flex-row items-center rounded-xl border border-gray-200 bg-white px-4">
              <Ionicons name="search-outline" size={23} color="#5F6878" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search held sales..."
                placeholderTextColor="#9299A7"
                className="ml-3 flex-1 text-[15px] text-gray-950"
              />
            </View>
            <View className="h-[50px] w-[50px] items-center justify-center rounded-xl border border-gray-200 bg-white">
              <Ionicons name="filter-outline" size={22} color="#20324A" />
            </View>
          </View>
          <View className="mt-3 flex-row" style={{ gap: 10 }}>
            <View className="h-[44px] flex-1 flex-row rounded-xl border border-gray-200 bg-white p-1">
              {([['ALL', 'All'], ['MINE', 'My Held'], ['OTHERS', 'Others']] as const).map(([key, label]) => (
                <Pressable key={key} onPress={() => setFilter(key)} className={`flex-1 items-center justify-center rounded-lg ${filter === key ? 'bg-brand' : ''}`}>
                  <Text className={`text-[13px] font-semibold ${filter === key ? 'text-white' : 'text-gray-700'}`}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setNewestFirst((value) => !value)} className="h-[44px] flex-row items-center rounded-xl bg-[#F0F1F5] px-3">
              <Text className="text-[13px] font-semibold text-gray-800">{newestFirst ? 'Newest First' : 'Oldest First'}</Text>
              <Ionicons name="chevron-down" size={16} color="#26364B" />
            </Pressable>
          </View>
        </View>

        {query.isLoading ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color={colors.brand.DEFAULT} /></View>
        ) : query.isError ? (
          <Pressable onPress={() => query.refetch()} className="flex-1 items-center justify-center px-8">
            <Ionicons name="cloud-offline-outline" size={42} color={colors.text.muted} />
            <Text className="mt-3 text-[15px] font-bold text-gray-800">Could not load held sales</Text>
            <Text className="mt-1 text-[12px] text-gray-500">Tap to retry</Text>
          </Pressable>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 14, paddingBottom: 12, flexGrow: rows.length ? undefined : 1 }}
            refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={colors.brand.DEFAULT} />}
            ListEmptyComponent={(
              <View className="flex-1 items-center justify-center px-8">
                <Ionicons name="pause-circle-outline" size={44} color={colors.text.muted} />
                <Text className="mt-3 text-[16px] font-bold text-gray-800">No held sales found</Text>
                <Text className="mt-1 text-center text-[13px] text-gray-500">Hold a cart to resume it later from this screen.</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View className="mb-3 rounded-xl border border-gray-100 bg-white p-3" style={{ shadowColor: '#0B241A', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
                <View className="flex-row">
                  <View className="h-14 w-14 items-center justify-center rounded-xl bg-brand-light">
                    <Ionicons name="cart-outline" size={26} color={colors.brand.dark} />
                  </View>
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center">
                      <Text className="text-[16px] font-extrabold text-gray-950">{item.reference}</Text>
                      <View className="ml-2 rounded-full bg-amber-50 px-2 py-1"><Text className="text-[11px] font-semibold text-amber-700">Ⅱ On Hold</Text></View>
                    </View>
                    <Text className="mt-1 text-[13px] text-gray-700">
                      {item.customerSnapshot?.name ?? 'Walk-in Customer'}{item.customerSnapshot?.TIN ? `  •  TIN: ${item.customerSnapshot.TIN}` : '  •  No TIN'}
                    </Text>
                    <Text className="mt-1 text-[12px] text-gray-600">{item.itemCount} item{item.itemCount === 1 ? '' : 's'}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[15px] font-extrabold text-green-600">{money(item.totalAmount)}</Text>
                    <Text className="mt-1 text-[12px] text-gray-600">{heldTime(item.createdAt)}</Text>
                  </View>
                </View>
                <View className="mt-2 flex-row items-end">
                  <View className="ml-[68px] flex-1 flex-row" style={{ gap: 5 }}>
                    {item.cartSnapshot.slice(0, 4).map((cartItem, index) => {
                      const uri = imageUri(cartItem.imageUrl);
                      return (
                        <View key={`${cartItem.productId ?? cartItem.name}-${index}`} className="h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
                          {uri ? <Image source={{ uri }} className="h-full w-full" resizeMode="contain" /> : <Text className="text-[12px] font-bold text-brand-dark">{(cartItem.name ?? cartItem.serviceName ?? 'I').charAt(0)}</Text>}
                        </View>
                      );
                    })}
                  </View>
                  <Pressable
                    onPress={() => resumeMutation.mutate(item.id)}
                    disabled={resumeMutation.isPending}
                    className="h-10 flex-row items-center rounded-lg border border-green-200 bg-green-50 px-3"
                  >
                    <Ionicons name="play-outline" size={17} color={colors.brand.dark} />
                    <Text className="ml-1.5 text-[13px] font-bold text-brand-dark">Continue</Text>
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(item)} className="ml-2 h-10 w-10 items-center justify-center rounded-lg border border-red-100 bg-red-50">
                    <Ionicons name="trash-outline" size={19} color={colors.danger} />
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}

        <Pressable onPress={() => navigation.navigate('ProductSelection')} className="mx-4 mb-3 h-12 flex-row items-center justify-center rounded-xl border border-dashed border-brand bg-brand-light">
          <Ionicons name="add-circle" size={22} color={colors.brand.dark} />
          <Text className="ml-2 text-[15px] font-bold text-brand-dark">New Sale</Text>
        </Pressable>
      </View>
      <ReferenceBottomBar active="More" onNavigate={goTab} />
    </SafeAreaView>
  );
}
