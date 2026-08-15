import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { createCustomer, ensureWalkInCustomer, getCustomers, type Customer } from '../../api/customers';
import { useCartStore } from '../../store/cartStore';
import { colors } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CustomerPicker'>;
type CustomerType = 'INDIVIDUAL' | 'CORPORATE' | 'INSURANCE';
type Mode = 'SELECT' | 'NEW';

const customerTypes: Array<{ value: CustomerType; label: string }> = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'CORPORATE', label: 'Corporate' },
  { value: 'INSURANCE', label: 'Insurance' },
];

function FormField({ label, value, onChangeText, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: 'default' | 'phone-pad' | 'number-pad' }) {
  return (
    <View className="mb-6">
      <Text className="mb-1.5 ml-1 text-[14px] text-gray-600">{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} className="min-h-[54px] rounded-xl border border-gray-200 bg-white px-4 text-[17px] font-semibold text-gray-950" placeholderTextColor={colors.text.muted} />
    </View>
  );
}

export default function CustomerPickerScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const currentCustomer = useCartStore((state) => state.customer);
  const setCustomer = useCartStore((state) => state.setCustomer);
  const [mode, setMode] = useState<Mode>(route.params?.mode ?? 'SELECT');
  const [search, setSearch] = useState('');
  const [tin, setTin] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('INDIVIDUAL');
  const [typeModal, setTypeModal] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const selectedType = customerTypes.find((type) => type.value === customerType)!;
  const customersQuery = useQuery({
    queryKey: ['customers', 'picker', search.trim()],
    queryFn: () => getCustomers({ search: search.trim() || undefined, limit: 100 }),
    enabled: mode === 'SELECT',
  });
  const customers = customersQuery.data?.customers ?? [];

  const finishSelection = (customer: Customer) => {
    if (route.params?.afterSave === 'BACK') { navigation.goBack(); return; }
    setCustomer(customer);
    navigation.replace('Checkout');
  };
  const walkInMutation = useMutation({
    mutationFn: ensureWalkInCustomer,
    onSuccess: finishSelection,
    onError: (error: any) => setSelectionError(error?.response?.data?.error ?? error?.message ?? 'Unable to select the walk-in customer.'),
  });
  const saveMutation = useMutation({
    mutationFn: async () => {
      const cleanTin = tin.trim();
      const cleanPhone = phone.trim();
      const cleanName = name.trim();
      if (!cleanTin && !cleanPhone && !cleanName) return ensureWalkInCustomer();
      return createCustomer({ name: cleanName || cleanPhone || cleanTin, phone: cleanPhone || undefined, TIN: cleanTin || undefined, type: customerType, balance: 0 });
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      finishSelection(customer);
    },
  });

  const error = selectionError
    ?? (saveMutation.isError ? (saveMutation.error as any)?.response?.data?.error ?? 'Unable to save customer information.' : null);

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="h-[76px] flex-row items-center px-6">
        <Pressable onPress={() => navigation.goBack()} className="mr-8 h-11 w-11 items-center justify-center" hitSlop={10}><Ionicons name="arrow-back" size={30} color="#fff" /></Pressable>
        <Text className="text-[21px] font-bold text-white">Customer Information</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 overflow-hidden rounded-t-[18px] bg-white">
        <View className="mx-5 mt-5 h-[48px] flex-row rounded-xl bg-gray-100 p-1">
          <Pressable onPress={() => setMode('SELECT')} className={`flex-1 items-center justify-center rounded-lg ${mode === 'SELECT' ? 'bg-brand' : ''}`}><Text className={`text-[14px] font-bold ${mode === 'SELECT' ? 'text-white' : 'text-gray-600'}`}>Select Customer</Text></Pressable>
          <Pressable onPress={() => setMode('NEW')} className={`flex-1 items-center justify-center rounded-lg ${mode === 'NEW' ? 'bg-brand' : ''}`}><Text className={`text-[14px] font-bold ${mode === 'NEW' ? 'text-white' : 'text-gray-600'}`}>Add New</Text></Pressable>
        </View>

        {mode === 'SELECT' ? (
          <View className="flex-1 px-5 pt-4">
            {currentCustomer ? (
              <Pressable onPress={() => finishSelection(currentCustomer)} className="mb-3 flex-row items-center rounded-xl border border-brand bg-brand-light p-4">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-brand"><Text className="text-[17px] font-bold text-white">{currentCustomer.name.charAt(0).toUpperCase()}</Text></View>
                <View className="ml-3 flex-1"><Text className="text-[12px] font-semibold text-green-700">CURRENT CUSTOMER</Text><Text className="mt-1 text-[15px] font-bold text-gray-950">{currentCustomer.name}</Text><Text className="mt-1 text-[12px] text-gray-500">{currentCustomer.phone || currentCustomer.TIN || 'No contact information'}</Text></View>
                <Ionicons name="checkmark-circle" size={24} color={colors.brand.DEFAULT} />
              </Pressable>
            ) : null}

            <Pressable onPress={() => walkInMutation.mutate()} disabled={walkInMutation.isPending} className="mb-3 flex-row items-center rounded-xl border border-gray-200 bg-white p-4">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-light"><Ionicons name="walk-outline" size={23} color={colors.brand.dark} /></View>
              <View className="ml-3 flex-1"><Text className="text-[15px] font-bold text-gray-950">Walk-in Customer</Text><Text className="mt-1 text-[12px] text-gray-500">Continue without customer details</Text></View>
              {walkInMutation.isPending ? <ActivityIndicator color={colors.brand.DEFAULT} /> : <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />}
            </Pressable>

            <View className="h-[50px] flex-row items-center rounded-xl border border-gray-200 px-4">
              <Ionicons name="search-outline" size={21} color={colors.text.muted} />
              <TextInput value={search} onChangeText={setSearch} placeholder="Search existing customers..." placeholderTextColor={colors.text.muted} className="ml-3 flex-1 text-[15px]" />
              {search ? <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={19} color={colors.text.muted} /></Pressable> : null}
            </View>

            {error ? <View className="mt-3 rounded-lg bg-red-50 px-4 py-3"><Text className="text-[13px] text-red-600">{error}</Text></View> : null}
            {customersQuery.isLoading ? (
              <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand.DEFAULT} /></View>
            ) : customersQuery.isError ? (
              <Pressable onPress={() => customersQuery.refetch()} className="flex-1 items-center justify-center"><Text className="text-[14px] font-semibold text-red-600">Could not load customers. Tap to retry.</Text></Pressable>
            ) : (
              <ScrollView className="mt-3 flex-1" contentContainerStyle={{ paddingBottom: 30 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {customers.filter((customer) => customer.name.toLowerCase() !== 'walk-in customer').map((customer) => (
                  <Pressable key={customer.id} onPress={() => finishSelection(customer)} className="mb-2 flex-row items-center rounded-xl border border-gray-100 bg-white px-4 py-3.5">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-light"><Text className="text-[15px] font-bold text-brand-dark">{customer.name.charAt(0).toUpperCase()}</Text></View>
                    <View className="ml-3 flex-1"><Text className="text-[15px] font-bold text-gray-950">{customer.name}</Text><Text className="mt-1 text-[12px] text-gray-500">{customer.phone || customer.TIN || 'No contact information'}</Text></View>
                    {currentCustomer?.id === customer.id ? <Ionicons name="checkmark-circle" size={22} color={colors.brand.DEFAULT} /> : <Ionicons name="chevron-forward" size={19} color={colors.text.muted} />}
                  </Pressable>
                ))}
                {customers.length === 0 ? <Text className="py-14 text-center text-[14px] text-gray-500">No customers found. Choose Add New to create one.</Text> : null}
              </ScrollView>
            )}
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <FormField label="TIN (Optional)" value={tin} onChangeText={setTin} keyboardType="number-pad" />
            <FormField label="Phone (Optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <FormField label="Name (Optional)" value={name} onChangeText={setName} />
            <View className="mb-7">
              <Text className="mb-1.5 ml-1 text-[14px] text-gray-600">Customer Type</Text>
              <Pressable onPress={() => setTypeModal(true)} className="min-h-[54px] flex-row items-center rounded-xl border border-gray-200 bg-white px-4"><Text className="flex-1 text-[17px] font-semibold text-gray-950">{selectedType.label}</Text><Ionicons name="chevron-down" size={22} color="#777984" /></Pressable>
            </View>
            {error ? <View className="mb-4 rounded-lg bg-red-50 px-4 py-3"><Text className="text-[13px] text-red-600">{error}</Text></View> : null}
            <Pressable onPress={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="min-h-[54px] items-center justify-center rounded-xl bg-brand disabled:opacity-50">{saveMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-[18px] font-bold text-white">Save &amp; Continue</Text>}</Pressable>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <Modal visible={typeModal} transparent animationType="fade" onRequestClose={() => setTypeModal(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setTypeModal(false)}>
          <Pressable className="rounded-t-[18px] bg-white px-5 pb-8 pt-5" onPress={() => {}}>
            <Text className="mb-3 text-[17px] font-bold text-gray-950">Customer Type</Text>
            {customerTypes.map((type) => (
              <Pressable key={type.value} onPress={() => { setCustomerType(type.value); setTypeModal(false); }} className="flex-row items-center border-b border-gray-100 py-4"><Text className="flex-1 text-[15px] font-semibold text-gray-800">{type.label}</Text>{type.value === customerType ? <Ionicons name="checkmark" size={21} color={colors.brand.DEFAULT} /> : null}</Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
