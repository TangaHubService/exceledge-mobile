import { useCallback, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppTabParamList } from '../../navigation/AppTabs';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getCustomers } from '../../api/customers';
import { colors } from '../../theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Customers'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function CustomerListScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const customersQuery = useQuery({
    queryKey: ['customers', search],
    queryFn: () => getCustomers({ search: search.trim() || undefined, limit: 100 }),
  });

  useFocusEffect(useCallback(() => {
    customersQuery.refetch();
    // The query object itself changes as fetch state changes; refetch is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]));

  const customers = customersQuery.data?.customers ?? [];

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="h-[76px] flex-row items-center px-5">
        <Text className="flex-1 text-[22px] font-bold text-white">Customers</Text>
        <Pressable
          onPress={() => navigation.navigate('CustomerPicker', { afterSave: 'BACK', mode: 'NEW' })}
          className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
        >
          <Ionicons name="person-add-outline" size={23} color="#fff" />
        </Pressable>
      </View>

      <View className="flex-1 overflow-hidden rounded-t-[18px] bg-white px-5 pt-4">
        <View className="min-h-[50px] flex-row items-center rounded-xl border border-gray-200 px-4">
          <Ionicons name="search" size={21} color={colors.text.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search customers..."
            placeholderTextColor={colors.text.muted}
            className="ml-3 flex-1 py-3 text-[15px] text-gray-950"
          />
          {search ? <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={19} color={colors.text.muted} /></Pressable> : null}
        </View>

        {customersQuery.isLoading ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand.DEFAULT} /></View>
        ) : customersQuery.isError ? (
          <Pressable onPress={() => customersQuery.refetch()} className="flex-1 items-center justify-center">
            <Ionicons name="cloud-offline-outline" size={38} color={colors.text.muted} />
            <Text className="mt-3 text-[14px] font-semibold text-gray-700">Could not load customers</Text>
            <Text className="mt-1 text-[12px] text-gray-500">Tap to retry</Text>
          </Pressable>
        ) : (
          <FlatList
            className="mt-4 flex-1"
            data={customers}
            keyExtractor={(customer) => String(customer.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={<RefreshControl refreshing={customersQuery.isRefetching} onRefresh={customersQuery.refetch} tintColor={colors.brand.DEFAULT} />}
            ListEmptyComponent={(
              <View className="items-center py-20">
                <Ionicons name="people-outline" size={42} color={colors.text.muted} />
                <Text className="mt-3 text-[14px] text-gray-500">No customers found</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View className="mb-3 flex-row items-center rounded-xl border border-gray-100 bg-white px-4 py-4">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-light">
                  <Text className="text-[17px] font-bold text-brand-dark">{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-[15px] font-bold text-gray-950">{item.name}</Text>
                  <Text className="mt-1 text-[12px] text-gray-500">{item.phone || item.TIN || 'No contact information'}</Text>
                </View>
                <View className="rounded-md bg-brand-light px-2 py-1">
                  <Text className="text-[10px] font-semibold text-brand-dark">{(item.customerType ?? 'INDIVIDUAL').replace('_', ' ')}</Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
