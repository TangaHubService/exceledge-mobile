import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getSaleById, refundSale } from '../../api/sales';
import { ReferenceBottomBar, ReferenceHeader, type ReferenceTab } from '../../components/ReferenceChrome';
import { colors } from '../../theme';
import { toast } from '../../utils/toast';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CustomerRefund'>;

function money(value: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Math.abs(Number(value || 0)))} RWF`;
}

export default function CustomerRefundScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const queryClient = useQueryClient();
  const { saleId, reason, note } = route.params;
  const [acknowledged, setAcknowledged] = useState(false);
  const saleQuery = useQuery({ queryKey: ['sale', saleId], queryFn: () => getSaleById(saleId) });
  const amount = Math.abs(Number(saleQuery.data?.totalAmount ?? 0));

  const refundMutation = useMutation({
    mutationFn: () => refundSale(saleId, note ? `${reason}: ${note}` : reason),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['sale', saleId] });
      queryClient.invalidateQueries({ queryKey: ['ebm-outbox'] });
      navigation.replace('EbmProcessing', {
        saleId: result.refundSale.id,
        mode: 'refund',
        invoiceNumber: result.refundSale.invoiceNumber ?? result.refundSale.saleNumber,
        totalAmount: Math.abs(result.refundAmount),
      });
    },
    onError: (error: any) => toast.error('Refund failed', error?.response?.data?.error ?? error?.message ?? 'Please try again.'),
  });
  const goTab = (tab: ReferenceTab) => navigation.navigate('AppTabs', { screen: tab });

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <ReferenceHeader title="Customer Refund" onBack={() => navigation.goBack()} />
      <View className="flex-1 bg-[#F8F9F8] p-4">
        <View className="flex-1 rounded-xl border border-gray-100 bg-white px-4 py-7" style={{ shadowColor: '#0B241A', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}>
          {saleQuery.isLoading ? (
            <View className="flex-1 items-center justify-center"><Text className="text-[14px] text-gray-600">Loading refund…</Text></View>
          ) : saleQuery.isError ? (
            <Pressable onPress={() => saleQuery.refetch()} className="flex-1 items-center justify-center"><Text className="text-[14px] font-semibold text-red-600">Could not load the invoice. Tap to retry.</Text></Pressable>
          ) : (
            <>
              <View className="flex-row items-center justify-between px-1 pb-8">
                <Text className="text-[17px] font-semibold text-[#606777]">Credit Note Amount</Text>
                <Text className="text-[23px] font-extrabold text-green-600">{money(amount)}</Text>
              </View>
              <Text className="text-[17px] font-extrabold text-gray-950">Refund Method</Text>
              <Pressable onPress={() => toast.info('Refund Method', 'Cash is the refund settlement method supported by the current backend.')} className="mt-3 h-[54px] flex-row items-center rounded-xl border border-gray-300 px-4">
                <Text className="flex-1 text-[17px] text-[#424957]">Cash</Text>
                <Ionicons name="chevron-down" size={23} color="#111827" />
              </Pressable>

              <Text className="mt-8 text-[17px] font-extrabold text-gray-950">Amount to Refund</Text>
              <View className="mt-3 h-[54px] justify-center rounded-xl border border-gray-300 px-4">
                <Text className="text-[17px] font-bold text-gray-950">{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount)}</Text>
              </View>

              <Pressable onPress={() => setAcknowledged((value) => !value)} className="mt-8 flex-row items-center justify-between">
                <Text className="text-[17px] font-extrabold text-gray-950">Customer Acknowledged</Text>
                <View className={`h-11 w-11 items-center justify-center rounded-full ${acknowledged ? 'bg-brand' : 'border-2 border-gray-300 bg-white'}`}>
                  {acknowledged ? <Ionicons name="checkmark" size={29} color="#fff" /> : null}
                </View>
              </Pressable>

              <Pressable
                onPress={() => refundMutation.mutate()}
                disabled={!acknowledged || refundMutation.isPending}
                className="mt-8 min-h-[58px] items-center justify-center rounded-xl bg-brand disabled:opacity-40"
              >
                <Text className="text-[17px] font-bold text-white">{refundMutation.isPending ? 'Processing…' : 'Process Refund'}</Text>
              </Pressable>
              {!acknowledged ? <Text className="mt-3 text-center text-[12px] text-gray-500">Confirm that the customer has acknowledged the refund.</Text> : null}
            </>
          )}
        </View>
      </View>
      <ReferenceBottomBar active="Home" onNavigate={goTab} />
    </SafeAreaView>
  );
}
