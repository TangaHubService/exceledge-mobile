import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { AppTabParamList } from '../../navigation/AppTabs';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getEbmOutbox, getEbmStatus } from '../../api/ebm';
import { logout as apiLogout } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { useShiftStore } from '../../store/shiftStore';
import { useIsOffline } from '../../components/OfflineBanner';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { colors } from '../../theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'More'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type RowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress?: () => void;
  danger?: boolean;
  children?: React.ReactNode;
  status?: React.ReactNode;
};

function SettingRow({ icon, title, subtitle, onPress, danger, children, status }: RowProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress && !children} className="border-b border-gray-200 px-4 py-4">
      <View className="flex-row items-center">
        <View className={`h-12 w-12 items-center justify-center rounded-xl ${danger ? 'bg-red-50' : 'bg-brand-light'}`}>
          <Ionicons name={icon} size={25} color={danger ? colors.danger : colors.brand.dark} />
        </View>
        <View className="ml-4 flex-1">
          <Text className={`text-[16px] font-extrabold ${danger ? 'text-red-600' : 'text-gray-950'}`}>{title}</Text>
          <Text className="mt-1 text-[13px] text-[#596579]">{subtitle}</Text>
        </View>
        {children ?? <Ionicons name="chevron-forward" size={23} color="#596579" />}
      </View>
      {status}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<Nav>();
  const offline = useIsOffline();
  const logout = useAuthStore((s) => s.logout);
  const setActiveShift = useShiftStore((s) => s.setActiveShift);
  const ebmQuery = useQuery({ queryKey: ['ebm-status'], queryFn: getEbmStatus, retry: false });
  const outboxQuery = useQuery({ queryKey: ['ebm-outbox'], queryFn: getEbmOutbox, retry: false });
  const pending = (outboxQuery.data ?? []).filter((item) => item.status !== 'SUCCEEDED').length;
  const connected = !offline && ebmQuery.data?.enabled === true && ebmQuery.data?.online === true;
  const lastSync = ebmQuery.data?.lastContact
    ? new Date(ebmQuery.data.lastContact).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Not available';

  const handleLogout = () => Alert.alert('Log out?', 'You will need to sign in again to use Excel Edge POS.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Log out', style: 'destructive', onPress: async () => {
        await apiLogout().catch(() => {});
        setActiveShift(null);
        await logout();
      },
    },
  ]);

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="h-[76px] flex-row items-center px-5">
        <Pressable onPress={() => navigation.goBack()} className="mr-6 h-11 w-11 items-center justify-center" hitSlop={10}><Ionicons name="arrow-back" size={30} color="#fff" /></Pressable>
        <Text className="text-[22px] font-bold text-white">Settings</Text>
      </View>
      <ScrollView className="bg-[#F8F9F8]" contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View className="overflow-hidden rounded-xl border border-gray-100 bg-white" style={{ shadowColor: '#0B241A', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <SettingRow icon="person-outline" title="Profile & Account" subtitle="View your profile, branch and terminal" onPress={() => navigation.navigate('ProfileAccount')} />
          <SettingRow icon="print-outline" title="Printer Settings" subtitle="Receipt printing and auto-print" onPress={() => navigation.navigate('PrinterSettings')} />
          <SettingRow
            icon="document-text-outline"
            title="EBM Settings"
            subtitle="EBM connection and synchronization"
            onPress={() => ebmQuery.refetch()}
            status={(
              <View className={`ml-16 mt-3 flex-row items-center rounded-lg px-3 py-2 ${connected ? 'bg-brand-light' : 'bg-amber-50'}`}>
                <View className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-600' : 'bg-amber-500'}`} />
                <Text className={`ml-2 text-[12px] font-bold ${connected ? 'text-green-700' : 'text-amber-700'}`}>{connected ? 'EBM Connected' : offline ? 'Offline' : 'EBM connection unavailable'}</Text>
              </View>
            )}
          />
          <SettingRow icon="card-outline" title="Payment Methods" subtitle="Choose which payment methods appear at checkout" onPress={() => navigation.navigate('PaymentMethods')} />
          <SettingRow
            icon="cloud-upload-outline"
            title="Offline & Sync"
            subtitle="View pending fiscal transactions and sync status"
            onPress={() => navigation.navigate('OfflineMode')}
            status={(
              <View className="ml-16 mt-3 flex-row overflow-hidden rounded-lg bg-gray-100">
                <View className={`flex-row items-center px-3 py-2 ${pending ? 'bg-orange-50' : 'bg-brand-light'}`}><Ionicons name="sync-outline" size={16} color={pending ? '#F06A00' : colors.brand.dark} /><Text className={`ml-2 text-[11px] font-bold ${pending ? 'text-orange-600' : 'text-green-700'}`}>{pending} Pending</Text></View>
                <View className="flex-1 items-center justify-center px-2"><Text numberOfLines={1} className="text-[10px] text-[#596579]">Last contact: {lastSync}</Text></View>
              </View>
            )}
          />
          <SettingRow icon="globe-outline" title="Language" subtitle="Choose your preferred language"><LanguageSwitcher dark={false} /></SettingRow>
          <SettingRow icon="lock-closed-outline" title="Security" subtitle="PIN, app lock and auto-lock" onPress={() => navigation.navigate('Security')} />
          <SettingRow icon="information-circle-outline" title="About & Support" subtitle="App information, support and diagnostics" onPress={() => navigation.navigate('About')} />
          <SettingRow icon="log-out-outline" title="Logout" subtitle="Sign out of your account" danger onPress={handleLogout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
