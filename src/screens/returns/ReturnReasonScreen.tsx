import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getSaleById } from '../../api/sales';
import { API_URL } from '../../api/client';
import { ReferenceBottomBar, ReferenceHeader, type ReferenceTab } from '../../components/ReferenceChrome';
import { colors } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ReturnReason'>;

const reasons: Array<{ title: string; description: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = [
  { title: 'Damaged / Defective', description: 'Item is damaged or not working properly', icon: 'cube-outline', color: '#087845', bg: '#E8F8EF' },
  { title: 'Wrong Item', description: 'Received the wrong item', icon: 'cube-outline', color: '#1976D2', bg: '#EAF3FF' },
  { title: 'Not as Described', description: 'Item is not as described', icon: 'pricetag-outline', color: '#F08A00', bg: '#FFF4E5' },
  { title: 'Changed Mind', description: 'No longer needed', icon: 'time-outline', color: '#7647DF', bg: '#F1EAFF' },
  { title: 'Other', description: 'Other reason', icon: 'alert-circle-outline', color: '#E22E65', bg: '#FFEAF1' },
];

function money(value: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value || 0))} RWF`;
}
function imageUri(value?: string | null) {
  if (!value) return null;
  if (value.startsWith('http') || value.startsWith('data:')) return value;
  return `${API_URL.replace(/\/api$/, '')}${value.startsWith('/') ? value : `/${value}`}`;
}

export default function ReturnReasonScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { saleId } = route.params;
  const [selected, setSelected] = useState(reasons[0].title);
  const [note, setNote] = useState('');
  const saleQuery = useQuery({ queryKey: ['sale', saleId], queryFn: () => getSaleById(saleId) });
  const sale = saleQuery.data;
  const items = sale?.saleItems ?? [];
  const goTab = (tab: ReferenceTab) => navigation.navigate('AppTabs', { screen: tab });

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <ReferenceHeader title="Return Reason" onBack={() => navigation.goBack()} right={<Ionicons name="ellipsis-vertical" size={27} color="#fff" />} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-[#F8F9F8]">
        <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 20 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {sale ? (
            <View className="rounded-xl border border-gray-100 bg-white p-4">
              <View className="flex-row items-center">
                <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-light"><Ionicons name="receipt-outline" size={24} color={colors.brand.dark} /></View>
                <View className="ml-3 flex-1">
                  <Text className="text-[17px] font-extrabold text-[#132238]">{sale.invoiceNumber ?? sale.saleNumber}</Text>
                  <Text className="mt-1 text-[13px] text-[#263B58]">{sale.customer?.name ?? 'Walk-in Customer'}</Text>
                  <Text className="mt-1 text-[12px] text-[#506079]">{new Date(sale.createdAt).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <View className="items-end"><Text className="text-[18px] font-extrabold text-green-600">{money(sale.totalAmount)}</Text><View className="mt-2 rounded-md bg-green-50 px-2 py-1"><Text className="text-[11px] text-green-700">Total Return Amount</Text></View></View>
              </View>
            </View>
          ) : null}

          {items.length ? (
            <View className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
              <Text className="text-[17px] font-extrabold text-[#132238]">Items Being Returned ({items.length})</Text>
              {items.map((item) => {
                const uri = imageUri(item.product?.imageUrl);
                return (
                  <View key={item.id} className="mt-3 flex-row items-center border-t border-gray-200 pt-3">
                    <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-brand-light">{uri ? <Image source={{ uri }} className="h-full w-full" resizeMode="contain" /> : <Text className="font-bold text-brand-dark">{(item.product?.name ?? 'I').charAt(0)}</Text>}</View>
                    <View className="ml-3 flex-1"><Text className="text-[14px] font-bold text-[#132238]">{item.product?.name ?? item.serviceName ?? `Item #${item.productId}`}</Text><Text className="mt-1 text-[12px] text-[#506079]">{item.quantity} {item.product?.measurementUnit ?? 'Pc'}</Text></View>
                    <View className="items-center"><Text className="text-[11px] text-[#506079]">Return Qty</Text><Text className="mt-1 text-[14px] font-semibold">{item.quantity}</Text></View>
                    <View className="ml-6 items-end"><Text className="text-[11px] text-[#506079]">Return Amount</Text><Text className="mt-1 text-[14px] font-semibold">{money(item.totalPrice)}</Text></View>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View className="mt-4 rounded-xl border border-gray-100 bg-white p-4">
            <Text className="text-[18px] font-extrabold text-[#132238]">Select Return Reason</Text>
            {reasons.map((reason) => {
              const active = reason.title === selected;
              return (
                <Pressable key={reason.title} onPress={() => setSelected(reason.title)} className={`mt-3 min-h-[67px] flex-row items-center rounded-xl border px-3 ${active ? 'border-brand bg-green-50/50' : 'border-gray-200 bg-white'}`}>
                  <View className="h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: reason.bg }}><Ionicons name={reason.icon} size={23} color={reason.color} /></View>
                  <View className="ml-3 flex-1"><Text className="text-[15px] font-bold text-[#132238]">{reason.title}</Text><Text className="mt-1 text-[12px] text-[#506079]">{reason.description}</Text></View>
                  <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? colors.brand.DEFAULT : '#29415F'} />
                </Pressable>
              );
            })}

            <Text className="mb-2 mt-5 text-[13px] text-[#506079]">Additional Note (Optional)</Text>
            <View className="rounded-xl border border-gray-300 bg-white p-3">
              <TextInput value={note} onChangeText={(value) => setNote(value.slice(0, 250))} multiline textAlignVertical="top" placeholder="Add any additional details about this return..." placeholderTextColor="#8994A7" className="min-h-[84px] text-[14px]" />
              <Text className="text-right text-[12px] text-[#506079]">{note.length}/250</Text>
            </View>

            <View className="mt-4 flex-row rounded-xl bg-brand-light p-3">
              <Ionicons name="information-circle-outline" size={23} color={colors.brand.dark} />
              <View className="ml-3 flex-1"><Text className="text-[14px] font-bold text-[#132238]">Return Policy</Text><Text className="mt-1 text-[12px] leading-5 text-[#364861]">Returns must be approved before the backend creates the refund and restores stock.</Text></View>
            </View>
          </View>

          <View className="mt-4 flex-row" style={{ gap: 12 }}>
            <Pressable onPress={() => navigation.goBack()} className="h-[50px] flex-1 items-center justify-center rounded-xl border border-brand-dark bg-white"><Text className="text-[15px] font-bold text-brand-dark">Back</Text></Pressable>
            <Pressable onPress={() => navigation.navigate('ReturnApproval', { saleId, reason: selected, note: note.trim() || undefined })} className="h-[50px] flex-1 items-center justify-center rounded-xl bg-brand"><Text className="text-[15px] font-bold text-white">Continue</Text></Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ReferenceBottomBar active="More" onNavigate={goTab} />
    </SafeAreaView>
  );
}
