import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getEbmOutboxForSale } from '../../api/ebm';
import { ReferenceBottomBar, type ReferenceTab } from '../../components/ReferenceChrome';
import { colors } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'EbmProcessing'>;

const SALE_STEPS = ['Validating transaction', 'Sending to EBM', 'Generating Fiscal Invoice', 'Updating ERP'];
const REFUND_STEPS = ['Validating Return', 'Sending to EBM', 'Credit Note Generated'];
const POLL_MS = 1500;
const MAX_POLLS = 40;

export default function EbmProcessingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { saleId, mode, invoiceNumber, totalAmount } = route.params;
  const [stepIndex, setStepIndex] = useState(0);
  const [failed, setFailed] = useState<string | null>(null);
  const pollCount = useRef(0);
  const stopped = useRef(false);
  const steps = mode === 'refund' ? REFUND_STEPS : SALE_STEPS;

  const goToSuccess = () => {
    if (stopped.current) return;
    stopped.current = true;
    const target = mode === 'refund' ? 'RefundSuccessful' : 'SaleSuccess';
    navigation.replace(target as any, { saleId, invoiceNumber, totalAmount });
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (stopped.current) return;
      pollCount.current += 1;
      try {
        const entries = await getEbmOutboxForSale(saleId);
        const entry = entries.find((candidate) => candidate.operation === (mode === 'refund' ? 'REFUND' : 'SALE'));

        if (!entry) {
          if (pollCount.current >= 2) {
            setStepIndex(steps.length);
            goToSuccess();
            return;
          }
        } else if (entry.status === 'SUCCEEDED') {
          setStepIndex(steps.length);
          setTimeout(goToSuccess, 500);
          return;
        } else if (entry.status === 'FAILED' || entry.status === 'DEAD_LETTER') {
          setFailed(entry.lastError ?? 'Fiscal submission failed. It will retry automatically in the background.');
          return;
        } else if (entry.status === 'PROCESSING') {
          setStepIndex(mode === 'refund' ? 1 : 2);
        } else {
          setStepIndex(1);
        }
      } catch {
        // A temporary connection error does not stop the server-side EBM outbox.
      }

      if (pollCount.current >= MAX_POLLS) {
        setFailed('This is taking longer than usual. The server will keep retrying in the background.');
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };

    timer = setTimeout(poll, POLL_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleId, mode]);

  const leaveProcessing = () => {
    Alert.alert(
      'Leave EBM processing?',
      'The sale is already recorded. Fiscal submission will continue safely in the background.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Leave', onPress: goToSuccess },
      ]
    );
  };

  const title = mode === 'refund' ? 'EBM Credit Note' : 'EBM Processing';
  const actionTitle = mode === 'refund' ? 'Generating Credit Note' : 'Submitting to EBM';
  const goTab = (tab: ReferenceTab) => navigation.navigate('AppTabs', { screen: tab });

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="h-[76px] flex-row items-center px-6">
        <Pressable onPress={leaveProcessing} className="mr-8 h-11 w-11 items-center justify-center" hitSlop={10}>
          <Ionicons name="arrow-back" size={30} color="#fff" />
        </Pressable>
        <Text className="text-[22px] font-bold text-white">{title}</Text>
      </View>

      <View className="flex-1 bg-[#F8F9F8] p-4">
      <View className="flex-1 overflow-hidden rounded-xl border border-gray-100 bg-white px-7 pb-7 pt-8">
        {failed ? (
          <View className="flex-1 items-center justify-center px-3">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-amber-50">
              <Ionicons name="warning-outline" size={42} color={colors.warning} />
            </View>
            <Text className="mt-5 text-center text-[22px] font-bold text-gray-950">Fiscal submission delayed</Text>
            <Text className="mt-3 text-center text-[14px] leading-6 text-gray-600">{failed}</Text>
            <View className="mt-6 flex-row rounded-xl bg-[#EEF7F2] px-4 py-4">
              <Ionicons name="information-circle" size={22} color={colors.brand.dark} />
              <Text className="ml-3 flex-1 text-[13px] leading-5 text-gray-700">
                The {mode === 'refund' ? 'refund' : 'sale'} was recorded successfully and the backend retry queue remains active.
              </Text>
            </View>
            <Pressable onPress={goToSuccess} className="mt-8 min-h-[54px] w-full items-center justify-center rounded-xl bg-brand">
              <Text className="text-[18px] font-bold text-white">Continue</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View className="items-center pt-14">
              <View className="h-[96px] w-[96px] items-center justify-center rounded-full border-[10px] border-green-50">
                <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
              </View>
              <Text className="mt-6 text-[25px] font-bold text-gray-950">{actionTitle}{mode === 'refund' ? '...' : ''}</Text>
              <Text className="mt-2 text-[18px] text-gray-600">Please wait...</Text>
            </View>

            <View className="mt-8 px-5">
              {steps.map((label, index) => {
                const done = index < stepIndex;
                const active = index === stepIndex;
                return (
                  <View key={label} className="mb-6 flex-row items-center">
                    <View className={`h-10 w-10 items-center justify-center rounded-full ${done ? 'bg-brand-light' : ''}`}>
                      {done ? (
                        <Ionicons name="checkmark" size={25} color={colors.brand.dark} />
                      ) : active ? (
                        <View className="h-8 w-8 items-center justify-center rounded-full border-2 border-green-100">
                          <ActivityIndicator size="small" color={colors.brand.DEFAULT} />
                        </View>
                      ) : (
                        <View className="h-7 w-7 rounded-full border-2 border-gray-300" />
                      )}
                    </View>
                    <Text className={`ml-4 text-[17px] ${done || active ? 'font-medium text-gray-950' : 'text-gray-500'}`}>{label}</Text>
                    <View className="flex-1" />
                    {done ? <Ionicons name="checkmark-circle" size={25} color={colors.brand.DEFAULT} /> : <View className="h-7 w-7 rounded-full border-2 border-gray-300" />}
                  </View>
                );
              })}
            </View>

            <View className="mt-2 flex-row rounded-xl border border-green-100 bg-[#EEF7F2] px-4 py-5">
              <Ionicons name="information-circle" size={24} color={colors.brand.dark} />
              <Text className="ml-3 flex-1 text-[14px] leading-6 text-gray-800">
                Please do not close the app or go back until the process is completed.
              </Text>
            </View>

            <View className="flex-1" />
            <Pressable onPress={leaveProcessing} className="min-h-[56px] items-center justify-center rounded-xl bg-brand">
              <Text className="text-[18px] font-bold text-white">Cancel</Text>
            </Pressable>
          </>
        )}
      </View>
      </View>
      {mode === 'refund' ? <ReferenceBottomBar active="Home" onNavigate={goTab} /> : null}
    </SafeAreaView>
  );
}
