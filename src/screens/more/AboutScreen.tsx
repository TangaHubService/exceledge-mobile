import { useCallback } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as MailComposer from 'expo-mail-composer';
import NetInfo from '@react-native-community/netinfo';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/authStore';
import { useShiftStore } from '../../store/shiftStore';
import { getEbmOutbox, getEbmStatus } from '../../api/ebm';
import { API_URL } from '../../api/client';
import { useIsOffline } from '../../components/OfflineBanner';
import { colors } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View className="min-h-[44px] flex-row items-center border-b border-gray-100 px-4 py-2.5">
      <Text className="w-32 text-[13px] text-[#596579]">{label}</Text>
      <Text numberOfLines={2} className={`flex-1 text-right text-[13px] font-semibold text-gray-950 ${mono ? 'font-mono text-[12px]' : ''}`}>{value}</Text>
    </View>
  );
}

export default function AboutScreen() {
  const navigation = useNavigation<Nav>();
  const offline = useIsOffline();
  const user = useAuthStore((s) => s.user);
  const organizations = useAuthStore((s) => s.organizations);
  const activeOrganizationId = useAuthStore((s) => s.activeOrganizationId);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const activeShift = useShiftStore((s) => s.activeShift);

  const organization = organizations.find((o) => o.id === activeOrganizationId);
  const ebmQuery = useQuery({ queryKey: ['ebm-status'], queryFn: getEbmStatus, retry: false });
  const outboxQuery = useQuery({ queryKey: ['ebm-outbox'], queryFn: getEbmOutbox, retry: false });
  const pending = (outboxQuery.data ?? []).filter((item) => item.status !== 'SUCCEEDED').length;

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const sdk = Constants.expoConfig?.sdkVersion ?? '—';

  const runDiagnostics = useCallback(async () => {
    const network = await NetInfo.fetch();
    const connected = network.isConnected !== false && network.isInternetReachable !== false;
    Alert.alert(
      'Diagnostics',
      [
        `Network: ${connected ? 'Connected' : 'Offline'}`,
        `EBM enabled: ${ebmQuery.data?.enabled === true ? 'Yes' : 'No'}`,
        `EBM online: ${ebmQuery.data?.online === true ? 'Yes' : 'No'}`,
        `EBM last contact: ${ebmQuery.data?.lastContact ? new Date(ebmQuery.data.lastContact).toLocaleString() : 'Never'}`,
        `Pending fiscal transactions: ${pending}`,
        `Signed in: ${user?.email ?? 'No'}`,
        `Shift: ${activeShift ? `#${activeShift.id} (${activeShift.status})` : 'No open shift'}`,
      ].join('\n'),
    );
  }, [activeShift, ebmQuery.data, pending, user?.email]);

  const contactSupport = useCallback(async () => {
    if (!(await MailComposer.isAvailableAsync())) {
      Alert.alert('Email not available', 'No mail app is configured on this device. Please contact your organization support contact.');
      return;
    }
    await MailComposer.composeAsync({
      subject: `Excel Edge POS support — ${organization?.name ?? ''}`,
      body: ['App version:', `Excel Edge POS v${version}`].join('\n'),
    });
  }, [organization?.name, version]);

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="h-[76px] flex-row items-center px-5">
        <Pressable onPress={() => navigation.goBack()} className="mr-6 h-11 w-11 items-center justify-center" hitSlop={10}><Ionicons name="arrow-back" size={30} color="#fff" /></Pressable>
        <Text className="text-[22px] font-bold text-white">About & Support</Text>
      </View>

      <ScrollView className="bg-[#F8F9F8]" contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View className="items-center py-4">
          <View className="h-[86px] w-[86px] items-center justify-center rounded-2xl bg-brand">
            <Text className="text-[36px] font-extrabold text-white">E</Text>
          </View>
          <Text className="mt-4 text-[20px] font-extrabold text-gray-950">Excel Edge POS</Text>
          <Text className="mt-1 text-[13px] text-[#596579]">Version {version} · SDK {sdk}</Text>
        </View>

        <View className="overflow-hidden rounded-xl border border-gray-100 bg-white" style={{ shadowColor: '#0B241A', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <InfoRow label="Account" value={user?.email ?? '—'} />
          <InfoRow label="Organization" value={organization?.name ?? '—'} />
          <InfoRow label="Branch ID" value={activeBranchId ? String(activeBranchId) : 'Not selected'} />
          <InfoRow label="Terminal" value="POS-01" />
          <InfoRow label="API Server" value={API_URL} mono />
        </View>

        <Text className="mb-2 mt-6 text-[13px] font-bold uppercase tracking-wide text-gray-400">Diagnostics</Text>
        <View className="overflow-hidden rounded-xl border border-gray-100 bg-white" style={{ shadowColor: '#0B241A', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <View className="flex-row items-center px-4 py-3.5">
            <View className={`h-2.5 w-2.5 rounded-full ${offline ? 'bg-red-500' : 'bg-green-600'}`} />
            <Text className="ml-2 flex-1 text-[14px] font-semibold text-gray-950">{offline ? 'Offline' : 'Online'}</Text>
            <Text className="text-[13px] text-[#596579]">Network</Text>
          </View>
          <View className="flex-row items-center border-t border-gray-100 px-4 py-3.5">
            {ebmQuery.isLoading ? <ActivityIndicator size="small" color={colors.brand.DEFAULT} /> : (
              <View className={`h-2.5 w-2.5 rounded-full ${ebmQuery.data?.online ? 'bg-green-600' : 'bg-amber-500'}`} />
            )}
            <Text className="ml-2 flex-1 text-[14px] font-semibold text-gray-950">
              {ebmQuery.isLoading ? 'Checking…' : ebmQuery.data?.enabled ? (ebmQuery.data?.online ? 'EBM connected' : 'EBM unavailable') : 'EBM disabled'}
            </Text>
            <Text className="text-[13px] text-[#596579]">EBM</Text>
          </View>
          <View className="flex-row items-center border-t border-gray-100 px-4 py-3.5">
            <View className={`h-2.5 w-2.5 rounded-full ${pending ? 'bg-orange-500' : 'bg-green-600'}`} />
            <Text className="ml-2 flex-1 text-[14px] font-semibold text-gray-950">{pending} pending</Text>
            <Text className="text-[13px] text-[#596579]">Fiscal queue</Text>
          </View>
        </View>

        <Pressable onPress={runDiagnostics} className="mt-4 min-h-[52px] flex-row items-center justify-center rounded-lg border border-brand bg-white">
          <Ionicons name="pulse-outline" size={21} color={colors.brand.dark} />
          <Text className="ml-2 text-[15px] font-bold text-brand-dark">Run Diagnostics</Text>
        </Pressable>

        <Pressable onPress={contactSupport} className="mt-3 min-h-[52px] flex-row items-center justify-center rounded-lg bg-brand">
          <Ionicons name="mail-outline" size={21} color="#fff" />
          <Text className="ml-2 text-[15px] font-bold text-white">Contact Support</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}