import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useCartStore, selectCartSubtotal } from '../../store/cartStore';
import { useShiftStore } from '../../store/shiftStore';
import { useAuthStore } from '../../store/authStore';
import { createSale } from '../../api/sales';
import type { SplitPayment } from '../../api/sales';
import { useIsOffline } from '../../components/OfflineBanner';
import { colors } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type PayMethod = 'CASH' | 'MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER' | 'DEBT' | 'MIXED';

const METHODS: {
  key: PayMethod;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  mutedIcon?: boolean;
}[] = [
  { key: 'CASH', label: 'Cash', description: 'Pay with cash', icon: 'cash-outline' },
  { key: 'MOBILE_MONEY', label: 'Mobile Money', description: 'Pay with MTN MoMo or Airtel Money', icon: 'phone-portrait-outline' },
  { key: 'CARD', label: 'Bank Card', description: 'Pay with Visa, Mastercard or Verve', icon: 'business-outline' },
  { key: 'BANK_TRANSFER', label: 'Bank Transfer', description: 'Pay directly from your bank', icon: 'business-outline' },
  { key: 'DEBT', label: 'Credit Sale', description: 'Record as credit sale', icon: 'receipt-outline' },
  { key: 'MIXED', label: 'More Options', description: 'Other payment methods', icon: 'ellipsis-horizontal', mutedIcon: true },
];

export default function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const items = useCartStore((state) => state.items);
  const customer = useCartStore((state) => state.customer);
  const clear = useCartStore((state) => state.clear);
  const activeShift = useShiftStore((state) => state.activeShift);
  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const isOffline = useIsOffline();
  const subtotal = useCartStore(selectCartSubtotal);

  const [method, setMethod] = useState<PayMethod>('CASH');
  const [mixedCash, setMixedCash] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mixedCashValue = useMemo(
    () => Math.min(Math.max(0, Number(mixedCash.replace(/,/g, '')) || 0), subtotal),
    [mixedCash, subtotal]
  );

  const { cashAmount, debtAmount, paymentType } = useMemo(() => {
    switch (method) {
      case 'DEBT':
        return { cashAmount: 0, debtAmount: subtotal, paymentType: 'DEBT' as const };
      case 'MOBILE_MONEY':
        return { cashAmount: subtotal, debtAmount: 0, paymentType: 'MOBILE_MONEY' as const };
      case 'CARD':
      case 'BANK_TRANSFER':
        return { cashAmount: subtotal, debtAmount: 0, paymentType: 'CREDIT_CARD' as const };
      case 'MIXED':
        return {
          cashAmount: mixedCashValue,
          debtAmount: Math.max(0, subtotal - mixedCashValue),
          paymentType: 'MIXED' as const,
        };
      default:
        return { cashAmount: subtotal, debtAmount: 0, paymentType: 'CASH' as const };
    }
  }, [method, mixedCashValue, subtotal]);

  const payments = useMemo<SplitPayment[] | undefined>(() => {
    switch (method) {
      case 'CASH':
        return [{ paymentMethod: 'CASH', amount: subtotal }];
      case 'CARD':
        return [{ paymentMethod: 'CARD', amount: subtotal }];
      case 'BANK_TRANSFER':
        return [{ paymentMethod: 'BANK', amount: subtotal }];
      case 'MIXED':
        return mixedCashValue > 0 ? [{ paymentMethod: 'CASH', amount: mixedCashValue }] : undefined;
      default:
        return undefined;
    }
  }, [method, mixedCashValue, subtotal]);

  const saleMutation = useMutation({
    mutationFn: () =>
      createSale({
        customerId: customer!.id,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        paymentType,
        cashAmount,
        debtAmount,
        insuranceAmount: 0,
        shiftId: activeShift?.id ?? undefined,
        branchId: activeBranchId,
        payments,
      }),
    onSuccess: (sale) => {
      clear();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['shift'] });
      navigation.replace('EbmProcessing', {
        saleId: sale.id,
        mode: 'sale',
        invoiceNumber: sale.invoiceNumber ?? sale.saleNumber,
        totalAmount: sale.totalAmount ?? subtotal,
      });
    },
    onError: (error: any) => {
      setSubmitError(error?.response?.data?.error ?? error?.response?.data?.message ?? error?.message ?? 'Sale failed. Please try again.');
    },
  });

  const canSubmit = items.length > 0 && !saleMutation.isPending && !isOffline;
  const formattedAmount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(subtotal);

  const handleSubmit = () => {
    setSubmitError(null);
    if (!customer) {
      setSubmitError('Select or create a customer before continuing.');
      return;
    }
    if (method === 'MOBILE_MONEY') {
      navigation.navigate('MobileMoney', { amount: subtotal });
      return;
    }
    saleMutation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="h-[76px] flex-row items-center px-6">
        <Pressable onPress={() => navigation.goBack()} className="mr-8 h-11 w-11 items-center justify-center" hitSlop={10}>
          <Ionicons name="arrow-back" size={30} color="#fff" />
        </Pressable>
        <Text className="text-[22px] font-bold text-white">Payment</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 overflow-hidden rounded-t-[18px] bg-white"
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 38 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-[15px] text-gray-600">Total Amount</Text>
          <Text className="mt-1 text-[30px] font-extrabold text-brand-dark">{formattedAmount}</Text>

          <View className="my-5 h-px bg-gray-200" />
          <Text className="mb-3 text-[16px] font-semibold text-gray-950">Select Payment Method</Text>

          <View className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {METHODS.map((item, index) => {
              const selected = item.key === method;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setMethod(item.key)}
                  className={`min-h-[66px] flex-row items-center px-4 ${index > 0 ? 'border-t border-gray-200' : ''}`}
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <View className={`h-10 w-10 items-center justify-center rounded-lg ${item.mutedIcon ? 'bg-gray-100' : ''}`}>
                    <Ionicons name={item.icon} size={26} color={item.mutedIcon ? '#777984' : colors.brand.dark} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[16px] font-bold text-gray-950">{item.label}</Text>
                    <Text className="mt-1 text-[13px] text-gray-500">{item.description}</Text>
                  </View>
                  <View className={`h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? 'border-brand-dark' : 'border-gray-300'}`}>
                    {selected ? <View className="h-2.5 w-2.5 rounded-full bg-brand-dark" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {method === 'MIXED' ? (
            <View className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
              <Text className="mb-1.5 text-[14px] text-gray-600">Cash Amount</Text>
              <TextInput
                value={mixedCash}
                onChangeText={setMixedCash}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.text.muted}
                className="min-h-[50px] rounded-lg border border-gray-200 px-4 text-[16px] font-semibold text-gray-950"
              />
            </View>
          ) : null}

          {submitError ? (
            <View className="mt-4 rounded-lg bg-red-50 px-4 py-3">
              <Text className="text-[13px] text-red-600">{submitError}</Text>
            </View>
          ) : null}

          <View className="mt-6 rounded-xl border border-gray-200 bg-[#FAFAFA] px-4 py-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-[15px] text-gray-600">Total Amount</Text>
              <Text className="text-[16px] font-bold text-gray-950">{formattedAmount}</Text>
            </View>
            <View className="my-4 border-t border-dashed border-gray-300" />
            <View className="flex-row items-center justify-between">
              <Text className="text-[15px] text-gray-600">Amount to Pay</Text>
              <Text className="text-[16px] font-bold text-green-600">{formattedAmount}</Text>
            </View>
          </View>

          {isOffline ? (
            <View className="mt-4 rounded-lg bg-amber-50 px-4 py-3">
              <Text className="text-center text-[13px] text-amber-700">Checkout is unavailable while offline.</Text>
            </View>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            className="mt-5 min-h-[52px] items-center justify-center rounded-xl bg-brand disabled:opacity-50"
          >
            <Text className="text-[18px] font-bold text-white">
              {saleMutation.isPending ? 'Processing…' : 'Next'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
