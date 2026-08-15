import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getEbmOutbox, getEbmStatus } from '../../api/ebm';
import { useIsOffline } from '../../components/OfflineBanner';
import { ReferenceBottomBar, ReferenceHeader, type ReferenceTab } from '../../components/ReferenceChrome';
import { colors } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function OfflineModeScreen() {
  const navigation = useNavigation<Nav>();
  const networkOffline = useIsOffline();
  const [checking, setChecking] = useState(false);
  const ebmQuery = useQuery({ queryKey: ['ebm-status'], queryFn: getEbmStatus, retry: false });
  const outboxQuery = useQuery({ queryKey: ['ebm-outbox'], queryFn: getEbmOutbox, retry: false });
  const pending = (outboxQuery.data ?? []).filter((item) => item.status !== 'SUCCEEDED').length;
  const ebmOffline = ebmQuery.data?.enabled === true && ebmQuery.data?.online === false;
  const degraded = networkOffline || ebmOffline;
  const goTab = (tab: ReferenceTab) => navigation.navigate('AppTabs', { screen: tab });

  const refresh = async () => {
    setChecking(true);
    try {
      const network = await NetInfo.fetch();
      if (network.isConnected === false || network.isInternetReachable === false) {
        Alert.alert('Still offline', 'Reconnect this device to the internet, then try again.');
        return;
      }
      await Promise.all([ebmQuery.refetch(), outboxQuery.refetch()]);
    } finally {
      setChecking(false);
    }
  };

  const countLabel = outboxQuery.data
    ? `${pending} Fiscal Transaction${pending === 1 ? '' : 's'} Pending`
    : 'Pending Status Unavailable';

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <ReferenceHeader title="Offline Mode" onBack={() => navigation.goBack()} />
      <View className="flex-1 bg-[#F8F9F8] p-4">
        <View className="items-center rounded-xl border border-gray-100 bg-white px-5 pb-6 pt-16" style={{ shadowColor: '#0B241A', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}>
          <View className={`h-[118px] w-[118px] items-center justify-center rounded-full ${degraded ? (networkOffline ? 'bg-red-50' : 'bg-amber-50') : 'bg-brand-light'}`}>
            <Ionicons name={networkOffline ? 'wifi-outline' : ebmOffline ? 'cloud-offline-outline' : 'cloud-done-outline'} size={68} color={networkOffline ? '#E80000' : ebmOffline ? '#D97706' : colors.brand.DEFAULT} />
          </View>
          <Text className="mt-6 text-[25px] font-extrabold text-[#111827]">{networkOffline ? 'You are offline' : ebmOffline ? 'EBM is offline' : 'Connection available'}</Text>
          <Text className="mt-4 max-w-[310px] text-center text-[17px] leading-7 text-[#626978]">
            {networkOffline
              ? 'Checkout is unavailable until this device reconnects. Existing server-side EBM submissions remain safely queued.'
              : ebmQuery.data?.online === false
                ? 'The internet is available, but EBM has not reported a recent successful connection.'
                : 'The device and EBM service are available. Fiscal submissions are processed by the backend queue.'}
          </Text>
          <View className={`mt-14 min-h-[58px] w-full flex-row items-center justify-center rounded-xl ${pending ? 'bg-orange-50' : 'bg-brand-light'}`}>
            <Ionicons name="time-outline" size={25} color={pending ? '#F06A00' : colors.brand.dark} />
            <Text className={`ml-3 text-[16px] font-extrabold ${pending ? 'text-orange-600' : 'text-green-700'}`}>{countLabel}</Text>
          </View>
          <Pressable onPress={refresh} disabled={checking} className="mt-4 min-h-[58px] w-full flex-row items-center justify-center rounded-xl bg-brand disabled:opacity-50">
            <Ionicons name="sync-outline" size={28} color="#fff" />
            <Text className="ml-3 text-[19px] font-bold text-white">{checking ? 'Checking…' : 'Check & Sync Status'}</Text>
          </Pressable>
        </View>
      </View>
      <ReferenceBottomBar active="More" onNavigate={goTab} />
    </SafeAreaView>
  );
}
