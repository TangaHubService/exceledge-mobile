import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useCartStore, selectCartSubtotal } from '../../store/cartStore';
import { useShiftStore } from '../../store/shiftStore';
import { useAuthStore } from '../../store/authStore';
import { createSale } from '../../api/sales';
import type { MobileMoneyProvider } from '../../api/sales';
import { colors } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'MobileMoney'>;

const PROVIDERS: { key: MobileMoneyProvider; label: string; shortLabel: string; color: string }[] = [
  { key: 'MTN_MOMO', label: 'MTN MoMo', shortLabel: 'MTN\nMoMo', color: '#F4C400' },
  { key: 'AIRTEL_MONEY', label: 'Airtel Money', shortLabel: 'airtel\nmoney', color: '#E31B23' },
];

function ProviderBadge({ provider }: { provider: MobileMoneyProvider }) {
  const item = PROVIDERS.find((candidate) => candidate.key === provider) ?? PROVIDERS[0];
  return (
    <View className="h-11 w-[58px] items-center justify-center rounded-md" style={{ backgroundColor: item.color }}>
      <Text className="text-center text-[9px] font-black leading-[10px] text-gray-950">{item.shortLabel}</Text>
    </View>
  );
}

export default function MobileMoneyScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const customer = useCartStore((state) => state.customer);
  const items = useCartStore((state) => state.items);
  const clear = useCartStore((state) => state.clear);
  const subtotal = useCartStore(selectCartSubtotal);
  const activeShift = useShiftStore((state) => state.activeShift);
  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const { amount } = route.params;

  const [provider, setProvider] = useState<MobileMoneyProvider>('MTN_MOMO');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [reference, setReference] = useState('');
  const [providerOpen, setProviderOpen] = useState(false);

  const normalizedPhone = phone.replace(/[^\d+]/g, '');
  const canConfirm = /^(?:\+?250|0)?7\d{8}$/.test(normalizedPhone) && amount > 0;
  const formattedAmount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount);

  const saleMutation = useMutation({
    mutationFn: async () => {
      if (!customer) throw new Error('Customer information is missing.');
      if (items.length === 0) throw new Error('The cart is empty.');
      if (Math.abs(subtotal - amount) > 0.01) throw new Error('The cart total changed during payment.');

      const ref = reference.trim() || `MM-${Date.now()}`;
      return createSale({
        customerId: customer.id,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          itemType: item.itemType,
        })),
        paymentType: 'MOBILE_MONEY',
        cashAmount: amount,
        debtAmount: 0,
        insuranceAmount: 0,
        shiftId: activeShift?.id ?? undefined,
        branchId: activeBranchId,
        payments: [{
          paymentMethod: provider,
          amount,
          reference: ref,
          metadata: {
            phone: normalizedPhone,
            provider,
            customerReference: reference.trim() || undefined,
          },
        }],
      });
    },
    onSuccess: (sale) => {
      clear();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['shift'] });
      navigation.replace('EbmProcessing', {
        saleId: sale.id,
        mode: 'sale',
        invoiceNumber: sale.invoiceNumber ?? sale.saleNumber,
        totalAmount: sale.totalAmount ?? amount,
      });
    },
  });

  const errorMessage = (saleMutation.error as any)?.response?.data?.error
    ?? (saleMutation.error as any)?.response?.data?.message
    ?? (saleMutation.error as any)?.message;

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="h-[76px] flex-row items-center px-6">
        <Pressable onPress={() => navigation.goBack()} className="mr-8 h-11 w-11 items-center justify-center" hitSlop={10}>
          <Ionicons name="arrow-back" size={30} color="#fff" />
        </Pressable>
        <Text className="text-[22px] font-bold text-white">Mobile Money</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 overflow-hidden rounded-t-[18px] bg-white"
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 38 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="min-h-[138px] flex-row items-center rounded-xl bg-[#F3F8F5] px-5 py-5">
            <View className="flex-1">
              <Text className="text-[14px] text-gray-600">Total Amount</Text>
              <Text className="mt-1 text-[29px] font-extrabold text-brand-dark">{formattedAmount}</Text>
              <Text className="mt-7 text-[13px] text-gray-600">Payment Method</Text>
              <Text className="mt-1 text-[16px] font-semibold text-gray-950">Mobile Money</Text>
            </View>
            <View className="mr-2 h-[88px] w-[108px] items-center justify-center">
              <View className="absolute right-1 h-12 w-[72px] rounded-lg bg-green-200" />
              <View className="h-[82px] w-[48px] items-center justify-center rounded-lg border-[4px] border-brand-dark bg-white">
                <View className="h-7 w-7 rounded-full bg-brand" />
                <View className="absolute bottom-1.5 h-1 w-3 rounded-full bg-brand-dark" />
              </View>
            </View>
          </View>

          <Text className="mb-2 mt-6 text-[15px] font-medium text-gray-950">Select Provider</Text>
          <Pressable
            onPress={() => setProviderOpen(true)}
            className="min-h-[58px] flex-row items-center rounded-xl border border-gray-200 bg-white px-4"
          >
            <Text className="flex-1 text-[17px] text-gray-950">
              {PROVIDERS.find((item) => item.key === provider)?.label}
            </Text>
            <Ionicons name="chevron-down" size={22} color={colors.text.secondary} />
            <View className="ml-4 border-l border-gray-200 pl-3">
              <ProviderBadge provider={provider} />
            </View>
          </Pressable>

          <Text className="mb-2 mt-5 text-[15px] font-medium text-gray-950">Phone Number</Text>
          <View className="min-h-[58px] flex-row items-center rounded-xl border border-gray-200 bg-white px-4">
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="0788123456"
              placeholderTextColor={colors.text.muted}
              className="flex-1 py-3 text-[17px] font-semibold text-gray-950"
            />
            <Ionicons name="person-add-outline" size={23} color={colors.brand.dark} />
          </View>

          <Text className="mb-2 mt-5 text-[15px] text-gray-600">Reference (Optional)</Text>
          <TextInput
            value={reference}
            onChangeText={setReference}
            placeholder="Enter payment reference"
            placeholderTextColor={colors.text.muted}
            autoCapitalize="characters"
            className="min-h-[58px] rounded-xl border border-gray-200 bg-white px-4 text-[17px] text-gray-950"
          />

          <Text className="mb-2 mt-5 text-[15px] font-medium text-gray-950">Amount</Text>
          <View className="min-h-[58px] flex-row items-center rounded-xl border border-gray-200 bg-[#FAFAFA] px-4">
            <Text className="flex-1 text-[17px] font-semibold text-gray-950">{formattedAmount}</Text>
            <Text className="text-[15px] font-semibold text-gray-600">RWF</Text>
          </View>

          <View className="mt-5 flex-row rounded-xl bg-[#EEF7F2] px-4 py-4">
            <Ionicons name="information-circle" size={21} color={colors.brand.dark} />
            <Text className="ml-3 flex-1 text-[13px] leading-5 text-gray-700">
              The payment will be recorded as a mobile money payment. No external request is sent to the mobile money provider.
            </Text>
          </View>

          {errorMessage ? (
            <View className="mt-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-[13px] text-red-600">{errorMessage}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => saleMutation.mutate()}
            disabled={!canConfirm || saleMutation.isPending}
            className="mt-5 min-h-[54px] flex-row items-center justify-center rounded-xl bg-brand disabled:opacity-50"
          >
            {saleMutation.isPending ? <ActivityIndicator color="#fff" /> : null}
            <Text className={`${saleMutation.isPending ? 'ml-2' : ''} text-[17px] font-bold text-white`}>
              {saleMutation.isPending ? 'Processing…' : 'Confirm Payment'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.goBack()}
            disabled={saleMutation.isPending}
            className="mt-4 min-h-[52px] items-center justify-center rounded-xl border border-brand-dark bg-white disabled:opacity-50"
          >
            <Text className="text-[17px] font-semibold text-brand-dark">Cancel</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={providerOpen} transparent animationType="fade" onRequestClose={() => setProviderOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setProviderOpen(false)}>
          <Pressable className="rounded-t-[24px] bg-white px-5 pb-10 pt-5" onPress={(event) => event.stopPropagation()}>
            <View className="mb-5 h-1 w-10 self-center rounded-full bg-gray-300" />
            <Text className="mb-3 text-[19px] font-bold text-gray-950">Select Provider</Text>
            {PROVIDERS.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => {
                  setProvider(item.key);
                  setProviderOpen(false);
                }}
                className="mb-2 flex-row items-center rounded-xl border border-gray-200 px-4 py-3"
              >
                <ProviderBadge provider={item.key} />
                <Text className="ml-4 flex-1 text-[16px] font-semibold text-gray-950">{item.label}</Text>
                <Ionicons
                  name={provider === item.key ? 'radio-button-on' : 'radio-button-off'}
                  size={23}
                  color={provider === item.key ? colors.brand.dark : colors.text.muted}
                />
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
