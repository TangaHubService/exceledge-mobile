import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getSaleById } from '../../api/sales';
import { ReferenceBottomBar, ReferenceHeader, type ReferenceTab } from '../../components/ReferenceChrome';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'RefundSuccessful'>;

function money(value: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Math.abs(Number(value || 0)))} RWF`;
}

export default function RefundSuccessfulScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { saleId, invoiceNumber, totalAmount } = route.params;
  const saleQuery = useQuery({ queryKey: ['sale', saleId], queryFn: () => getSaleById(saleId) });
  const sale = saleQuery.data;
  const method = sale?.paymentType === 'CASH' ? 'Cash' : (sale?.paymentType ?? 'Cash').replace(/_/g, ' ');
  const amount = Math.abs(Number(sale?.totalAmount ?? totalAmount));
  const openReceipt = (action: 'print' | 'share') => navigation.navigate('RefundReceipt', { saleId, invoiceNumber, totalAmount: amount, action });
  const goTab = (tab: ReferenceTab) => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'AppTabs', params: { screen: tab } }] }));

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <ReferenceHeader title="Refund Successful" onBack={() => goTab('Home')} />
      <View className="flex-1 bg-[#F8F9F8] p-4">
        <View className="flex-1 items-center rounded-xl border border-gray-100 bg-white px-5 pb-7 pt-14" style={{ shadowColor: '#0B241A', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}>
          <View className="h-[112px] w-[112px] items-center justify-center rounded-full bg-brand"><Ionicons name="checkmark" size={72} color="#fff" /></View>
          <Text className="mt-7 text-[25px] font-extrabold text-gray-950">Refund Completed</Text>

          <View className="mt-10 w-full border-y border-gray-200">
            <View className="min-h-[68px] flex-row items-center justify-between border-b border-gray-200">
              <Text className="text-[17px] font-semibold text-[#606777]">Amount Refunded</Text>
              <Text className="text-[22px] font-extrabold text-green-600">{money(amount)}</Text>
            </View>
            <View className="min-h-[68px] flex-row items-center justify-between">
              <Text className="text-[17px] font-semibold text-[#606777]">Method</Text>
              <Text className="text-[18px] font-bold text-gray-950">{method}</Text>
            </View>
          </View>

          <View className="flex-1" />
          <View className="w-full flex-row" style={{ gap: 16 }}>
            <Pressable onPress={() => openReceipt('print')} className="min-h-[58px] flex-1 flex-row items-center justify-center rounded-xl bg-brand"><Ionicons name="print-outline" size={25} color="#fff" /><Text className="ml-3 text-[18px] font-bold text-white">Print</Text></Pressable>
            <Pressable onPress={() => openReceipt('share')} className="min-h-[58px] flex-1 flex-row items-center justify-center rounded-xl bg-brand"><Ionicons name="share-social-outline" size={25} color="#fff" /><Text className="ml-3 text-[18px] font-bold text-white">Share</Text></Pressable>
          </View>
        </View>
      </View>
      <ReferenceBottomBar active="Home" onNavigate={goTab} />
    </SafeAreaView>
  );
}
