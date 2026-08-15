import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getSaleById } from '../../api/sales';
import { API_URL } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { ReferenceBottomBar, ReferenceHeader, type ReferenceTab } from '../../components/ReferenceChrome';
import { colors } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ReturnApproval'>;

function money(value: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value || 0))} RWF`;
}
function imageUri(value?: string | null) {
  if (!value) return null;
  if (value.startsWith('http') || value.startsWith('data:')) return value;
  return `${API_URL.replace(/\/api$/, '')}${value.startsWith('/') ? value : `/${value}`}`;
}

function SummaryValue({ label, value, green = false }: { label: string; value: string; green?: boolean }) {
  return <View className="mb-4 flex-1"><Text className="text-[12px] text-[#506079]">{label}</Text><Text className={`mt-1 text-[14px] font-semibold ${green ? 'text-green-700' : 'text-[#132238]'}`}>{value}</Text></View>;
}

export default function ReturnApprovalScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { saleId, reason, note } = route.params;
  const [comment, setComment] = useState('');
  const user = useAuthStore((s) => s.user);
  const saleQuery = useQuery({ queryKey: ['sale', saleId], queryFn: () => getSaleById(saleId) });
  const sale = saleQuery.data;
  const items = sale?.saleItems ?? [];
  const total = Number(sale?.totalAmount ?? 0);
  const tax = Number(sale?.vatAmount ?? items.reduce((sum, item) => sum + Number(item.taxAmount ?? 0), 0));
  const subtotal = Number(sale?.taxableAmount ?? Math.max(0, total - tax));
  const goTab = (tab: ReferenceTab) => navigation.navigate('AppTabs', { screen: tab });

  const reject = () => Alert.alert('Reject return?', 'No refund or inventory change will be made.', [
    { text: 'Keep reviewing', style: 'cancel' },
    { text: 'Reject', style: 'destructive', onPress: () => navigation.navigate('StartReturn') },
  ]);

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <ReferenceHeader title="Return Approval" onBack={() => navigation.goBack()} right={<Ionicons name="ellipsis-vertical" size={27} color="#fff" />} />
      <View className="flex-1 bg-[#F8F9F8]">
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {!sale ? (
            <Pressable onPress={() => saleQuery.refetch()} className="items-center py-20"><Text className="text-[14px] font-semibold text-gray-600">{saleQuery.isLoading ? 'Loading return…' : 'Could not load the invoice. Tap to retry.'}</Text></Pressable>
          ) : (
            <>
              <View className="rounded-xl border border-gray-100 bg-white p-4">
                <View className="flex-row items-center">
                  <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-light"><Ionicons name="document-text-outline" size={24} color={colors.brand.dark} /></View>
                  <View className="ml-3 flex-1"><View className="flex-row items-center"><Text className="text-[17px] font-extrabold text-[#132238]">RTN-{String(sale.id).padStart(6, '0')}</Text><View className="ml-2 rounded-md bg-amber-50 px-2 py-1"><Text className="text-[11px] text-amber-700">Pending Approval</Text></View></View><Text className="mt-1 text-[13px] text-[#263B58]">{sale.customer?.name ?? 'Walk-in Customer'}</Text><Text className="mt-1 text-[12px] text-[#506079]">{new Date().toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text></View>
                  <View className="items-end"><Text className="text-[18px] font-extrabold text-green-600">{money(total)}</Text><View className="mt-2 rounded-md bg-green-50 px-2 py-1"><Text className="text-[11px] text-green-700">Sales Return</Text></View></View>
                </View>
              </View>

              <View className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
                <Text className="mb-4 text-[17px] font-extrabold text-[#132238]">Return Summary</Text>
                <View className="flex-row" style={{ gap: 30 }}><SummaryValue label="Original Invoice" value={sale.invoiceNumber ?? sale.saleNumber} green /><SummaryValue label="Return Reason" value={reason} /></View>
                <View className="flex-row" style={{ gap: 30 }}><SummaryValue label="Return Date" value={new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} /><SummaryValue label="Requested By" value={user?.name ?? 'Current user'} green /></View>
                <View className="flex-row" style={{ gap: 30 }}><SummaryValue label="Customer" value={sale.customer?.name ?? 'Walk-in Customer'} green /><SummaryValue label="Total Return Amount" value={money(total)} green /></View>
              </View>

              <View className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
                <Text className="text-[17px] font-extrabold text-[#132238]">Items to be Returned ({items.length})</Text>
                <View className="mt-3 flex-row border-y border-gray-200 py-2"><Text className="flex-1 text-[12px] text-[#506079]">Item</Text><Text className="w-20 text-center text-[12px] text-[#506079]">Return Qty</Text><Text className="w-28 text-right text-[12px] text-[#506079]">Return Amount</Text></View>
                {items.map((item) => {
                  const uri = imageUri(item.product?.imageUrl);
                  return (
                    <View key={item.id} className="min-h-[72px] flex-row items-center border-b border-gray-200 py-3">
                      <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-brand-light">{uri ? <Image source={{ uri }} className="h-full w-full" resizeMode="contain" /> : <Text className="font-bold text-brand-dark">{(item.product?.name ?? 'I').charAt(0)}</Text>}</View>
                      <View className="ml-3 flex-1"><Text className="text-[14px] font-bold text-[#132238]">{item.product?.name ?? item.serviceName ?? `Item #${item.productId}`}</Text><Text className="mt-1 text-[12px] text-[#506079]">{item.quantity} {item.product?.measurementUnit ?? 'Pc'}</Text></View>
                      <Text className="w-20 text-center text-[14px]">{item.quantity}</Text><Text className="w-28 text-right text-[14px] font-medium">{money(item.totalPrice)}</Text>
                    </View>
                  );
                })}
                <View className="mt-3 flex-row justify-between"><Text className="text-[13px] text-[#31445D]">Subtotal</Text><Text className="text-[13px] text-[#31445D]">{money(subtotal)}</Text></View>
                <View className="mt-2 flex-row justify-between"><Text className="text-[13px] text-[#31445D]">Tax</Text><Text className="text-[13px] text-[#31445D]">{money(tax)}</Text></View>
                <View className="mt-3 flex-row justify-between rounded-md bg-brand-light px-2 py-3"><Text className="text-[15px] font-bold text-[#132238]">Total Return Amount</Text><Text className="text-[18px] font-extrabold text-green-600">{money(total)}</Text></View>
              </View>

              <View className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
                <Text className="text-[17px] font-extrabold text-[#132238]">Return Reason & Note</Text>
                <View className="mt-3 flex-row items-center"><View className="h-11 w-11 items-center justify-center rounded-full bg-brand-light"><Ionicons name="alert-circle-outline" size={23} color={colors.brand.dark} /></View><View className="ml-3 flex-1"><Text className="text-[14px] font-bold text-[#132238]">{reason}</Text><Text className="mt-1 text-[12px] text-[#506079]">{note || 'No additional note was provided.'}</Text></View></View>
              </View>

              <View className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
                <Text className="text-[17px] font-extrabold text-[#132238]">Approval Action</Text>
                <Text className="mb-2 mt-4 text-[13px] text-[#506079]">Approval Comment (Optional)</Text>
                <View className="rounded-xl border border-gray-300 p-3"><TextInput value={comment} onChangeText={(value) => setComment(value.slice(0, 250))} multiline textAlignVertical="top" placeholder="Add a comment..." placeholderTextColor="#8994A7" className="min-h-[70px] text-[14px]" /><Text className="text-right text-[12px] text-[#506079]">{comment.length}/250</Text></View>
                <View className="mt-4 flex-row" style={{ gap: 12 }}>
                  <Pressable onPress={reject} className="h-[50px] flex-1 flex-row items-center justify-center rounded-xl border border-brand-dark bg-white"><Ionicons name="close-outline" size={22} color={colors.danger} /><Text className="ml-2 text-[14px] font-bold text-red-600">Reject Return</Text></Pressable>
                  <Pressable onPress={() => navigation.navigate('CustomerRefund', { saleId, reason, note: [note, comment].filter(Boolean).join(' — ') || undefined })} className="h-[50px] flex-1 flex-row items-center justify-center rounded-xl bg-brand"><Ionicons name="checkmark-circle-outline" size={21} color="#fff" /><Text className="ml-2 text-[14px] font-bold text-white">Approve Return</Text></Pressable>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </View>
      <ReferenceBottomBar active="More" onNavigate={goTab} />
    </SafeAreaView>
  );
}
