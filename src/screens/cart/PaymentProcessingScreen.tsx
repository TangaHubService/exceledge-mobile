import { useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useCartStore, selectCartSubtotal } from '../../store/cartStore';
import { useShiftStore } from '../../store/shiftStore';
import { useAuthStore } from '../../store/authStore';
import {
  cancelMobileMoneyPayment,
  createSale,
  getMobileMoneyPaymentStatus,
} from '../../api/sales';
import { colors } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'PaymentProcessing'>;

const providerLabels = {
  MTN_MOMO: 'MTN MoMo',
  AIRTEL_MONEY: 'Airtel Money',
} as const;

function DetailRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`min-h-[48px] flex-row items-center justify-between ${last ? '' : 'border-b border-gray-200'}`}>
      <Text className="text-[14px] text-gray-950">{label}</Text>
      <Text numberOfLines={1} className="ml-5 max-w-[65%] text-right text-[14px] text-gray-950">{value}</Text>
    </View>
  );
}

export default function PaymentProcessingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const finalizeStarted = useRef(false);
  const { amount, provider, phone, reference, transactionId, rail } = route.params;

  const items = useCartStore((state) => state.items);
  const customer = useCartStore((state) => state.customer);
  const clear = useCartStore((state) => state.clear);
  const subtotal = useCartStore(selectCartSubtotal);
  const activeShift = useShiftStore((state) => state.activeShift);
  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const formattedAmount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount);

  const statusQuery = useQuery({
    queryKey: ['mobile-money-payment', transactionId, rail],
    queryFn: () => getMobileMoneyPaymentStatus(transactionId, rail),
    retry: false,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return !status || status === 'PENDING' ? 2500 : false;
    },
  });

  const saleMutation = useMutation({
    mutationFn: async () => {
      if (!customer) throw new Error('Customer information is missing.');
      if (items.length === 0) throw new Error('The cart is empty.');
      if (Math.abs(subtotal - amount) > 0.01) throw new Error('The cart total changed during payment.');

      return createSale({
        customerId: customer.id,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
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
          reference: transactionId,
          metadata: {
            phone,
            provider,
            rail,
            customerReference: reference,
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

  const paymentStatus = statusQuery.data?.status ?? 'PENDING';

  useEffect(() => {
    if (paymentStatus === 'COMPLETED' && !finalizeStarted.current) {
      finalizeStarted.current = true;
      saleMutation.mutate();
    }
  }, [paymentStatus, saleMutation]);

  const cancellation = useMutation({
    mutationFn: () => cancelMobileMoneyPayment(transactionId, rail),
    onSuccess: () => navigation.goBack(),
  });

  const failed = paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED';
  const finalizationError = saleMutation.error as any;
  const statusError = statusQuery.error as any;
  const errorMessage = finalizationError?.response?.data?.error
    ?? finalizationError?.response?.data?.message
    ?? finalizationError?.message
    ?? statusError?.response?.data?.error
    ?? statusError?.message;
  const isProcessing = !failed && !errorMessage;
  const statusText = saleMutation.isPending ? 'Finalizing' : failed ? paymentStatus === 'FAILED' ? 'Failed' : 'Cancelled' : 'Processing';

  const retryFinalization = () => {
    if (paymentStatus === 'COMPLETED') saleMutation.mutate();
    else statusQuery.refetch();
  };

  const cancel = () => {
    if (paymentStatus === 'COMPLETED' || saleMutation.isPending) return;
    cancellation.mutate();
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="h-[76px] flex-row items-center px-6">
        <Pressable onPress={cancel} disabled={cancellation.isPending || saleMutation.isPending} className="mr-8 h-11 w-11 items-center justify-center" hitSlop={10}>
          <Ionicons name="arrow-back" size={30} color="#fff" />
        </Pressable>
        <Text className="text-[22px] font-bold text-white">Payment</Text>
      </View>

      <View className="flex-1 overflow-hidden rounded-t-[18px] bg-white">
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 38 }} showsVerticalScrollIndicator={false}>
          <View className="min-h-[138px] flex-row items-center rounded-xl bg-[#F3F8F5] px-5 py-5">
            <View className="flex-1">
              <Text className="text-[14px] text-gray-950">Total Amount</Text>
              <Text className="mt-1 text-[29px] font-extrabold text-brand-dark">{formattedAmount}</Text>
              <Text className="mt-6 text-[13px] text-gray-950">Payment Method</Text>
              <Text className="mt-1 text-[16px] font-semibold text-gray-950">
                Mobile Money ({providerLabels[provider]})
              </Text>
            </View>
            <View className="mr-2 h-[88px] w-[108px] items-center justify-center">
              <View className="absolute right-1 h-12 w-[72px] rounded-lg bg-green-200" />
              <View className="h-[82px] w-[48px] items-center justify-center rounded-lg border-[4px] border-brand-dark bg-white">
                <View className="h-9 w-9 items-center justify-center rounded-full bg-brand">
                  <Ionicons name="checkmark" size={25} color="#fff" />
                </View>
              </View>
            </View>
          </View>

          <View className="items-center px-5 pb-8 pt-10">
            {isProcessing ? (
              <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
            ) : (
              <Ionicons name="alert-circle-outline" size={58} color={colors.danger} />
            )}
            <Text className="mt-5 text-[20px] font-bold text-gray-950">
              {isProcessing ? 'Processing Payment' : 'Payment Needs Attention'}
            </Text>
            <Text className="mt-2 text-center text-[14px] leading-5 text-gray-700">
              {isProcessing
                ? 'Please wait while we process your payment…\nDo not close this screen.'
                : errorMessage ?? 'The mobile money payment was not completed.'}
            </Text>
          </View>

          <View className="rounded-xl border border-gray-200 bg-white px-4 py-1">
            <DetailRow label="Provider" value={providerLabels[provider]} />
            <DetailRow label="Phone Number" value={phone} />
            <DetailRow label="Reference" value={reference || transactionId} />
            <DetailRow label="Amount" value={`${formattedAmount} RWF`} />
            <View className="min-h-[48px] flex-row items-center justify-between">
              <Text className="text-[14px] text-gray-950">Status</Text>
              <View className={`flex-row items-center rounded-full px-3 py-1.5 ${failed || errorMessage ? 'bg-red-50' : 'bg-blue-50'}`}>
                <View className={`mr-2 h-2 w-2 rounded-full ${failed || errorMessage ? 'bg-red-500' : 'bg-blue-500'}`} />
                <Text className={`text-[13px] font-semibold ${failed || errorMessage ? 'text-red-600' : 'text-blue-600'}`}>
                  {statusText}
                </Text>
              </View>
            </View>
          </View>

          {errorMessage || failed ? (
            <Pressable
              onPress={retryFinalization}
              disabled={saleMutation.isPending || statusQuery.isFetching}
              className="mt-5 min-h-[52px] items-center justify-center rounded-xl bg-brand disabled:opacity-50"
            >
              <Text className="text-[17px] font-bold text-white">
                {paymentStatus === 'COMPLETED' ? 'Finalize Sale' : 'Check Again'}
              </Text>
            </Pressable>
          ) : null}

          {paymentStatus !== 'COMPLETED' ? (
            <Pressable
              onPress={cancel}
              disabled={cancellation.isPending}
              className="mt-5 min-h-[52px] items-center justify-center rounded-xl border border-brand-dark bg-white disabled:opacity-50"
            >
              <Text className="text-[17px] font-semibold text-brand-dark">
                {cancellation.isPending ? 'Cancelling…' : 'Cancel Payment'}
              </Text>
            </Pressable>
          ) : null}

          {cancellation.error ? (
            <Text className="mt-3 text-center text-[13px] text-red-600">
              {(cancellation.error as any)?.response?.data?.error ?? 'Could not cancel the payment.'}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
