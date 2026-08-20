import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { closeShift, getShiftSummary, type ShiftSummary } from '../../api/shifts';
import { useShiftStore } from '../../store/shiftStore';
import { ReferenceBottomBar, ReferenceHeader, type ReferenceTab } from '../../components/ReferenceChrome';
import { toast } from '../../utils/toast';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function money(value: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value || 0))} RWF`;
}

function Row({ label, value, tone = 'default', bold = false, children }: { label: string; value?: string; tone?: 'default' | 'green' | 'red'; bold?: boolean; children?: React.ReactNode }) {
  const color = tone === 'green' ? 'text-green-700' : tone === 'red' ? 'text-red-600' : 'text-gray-950';
  return (
    <View className="min-h-[62px] flex-row items-center justify-between">
      <Text className={`text-[16px] ${bold ? 'font-extrabold text-gray-950' : 'font-medium text-[#252C38]'}`}>{label}</Text>
      {children ?? <Text className={`ml-4 text-right text-[16px] ${bold ? 'font-extrabold' : 'font-semibold'} ${color}`}>{value}</Text>}
    </View>
  );
}

export default function CloseShiftScreen() {
  const navigation = useNavigation<Nav>();
  const activeShift = useShiftStore((s) => s.activeShift);
  const setActiveShift = useShiftStore((s) => s.setActiveShift);
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  const [actualCash, setActualCash] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeShift) { setLoading(false); return; }
    setError(null);
    try { setSummary((await getShiftSummary(activeShift.id)).summary); }
    catch (requestError: any) { setError(requestError?.response?.data?.error ?? requestError?.message ?? 'Failed to load shift summary.'); }
    finally { setLoading(false); }
  }, [activeShift]);
  useEffect(() => { load(); }, [load]);

  const hasActual = actualCash.trim() !== '' && Number.isFinite(Number(actualCash));
  const actualValue = hasActual ? Number(actualCash) : 0;
  const difference = useMemo(() => hasActual && summary ? actualValue - Number(summary.expectedCash) : null, [actualValue, hasActual, summary]);
  const netSales = Number(summary?.grossSales ?? 0) - Math.abs(Number(summary?.returns ?? 0));
  const goTab = (tab: ReferenceTab) => navigation.navigate('AppTabs', { screen: tab });

  const handleClose = () => {
    if (!activeShift || !summary) return;
    if (!hasActual || actualValue < 0) { toast.warning('Actual cash required', 'Count the till and enter the actual cash amount.'); return; }
    Alert.alert('Close shift?', `The recorded difference is ${money(difference ?? 0)}. Closing a shift cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close Shift', style: 'destructive', onPress: async () => {
          setSubmitting(true);
          try {
            const result = await closeShift(activeShift.id, { actualCash: actualValue });
            setActiveShift(null);
            if (result.needsApproval || result.shift.status === 'PENDING_APPROVAL') {
              navigation.reset({ index: 0, routes: [{ name: 'AppTabs', params: { screen: 'Home' } }] });
              setTimeout(() => toast.success('Submitted for approval', 'Your shift closing was submitted. A manager will approve or reject it before it is finalised.'), 300);
            } else {
              navigation.reset({ index: 0, routes: [{ name: 'OpenShift' }] });
            }
          } catch (requestError: any) {
            toast.error('Could not close shift', requestError?.response?.data?.error ?? requestError?.message ?? 'Please try again.');
          } finally { setSubmitting(false); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <ReferenceHeader title="Shift Summary" onBack={() => navigation.goBack()} />
      <View className="flex-1 bg-[#F8F9F8] p-4">
        <View className="rounded-xl border border-gray-100 bg-white px-5 py-7" style={{ shadowColor: '#0B241A', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 }}>
          {loading ? (
            <Text className="py-20 text-center text-[14px] text-gray-600">Loading shift summary…</Text>
          ) : error ? (
            <Pressable onPress={load} className="py-20"><Text className="text-center text-[14px] font-semibold text-red-600">{error}{'\n'}Tap to retry</Text></Pressable>
          ) : !summary ? (
            <Text className="py-20 text-center text-[14px] text-gray-600">No open shift found.</Text>
          ) : (
            <>
              <Row label="Opening Cash" value={money(summary.openingFloat)} />
              {summary.openingMobileMoney ? <Row label="Opening Mobile Money" value={money(summary.openingMobileMoney)} /> : null}
              <Row label="Cash Sales" value={money(summary.cashSales)} />
              <Row label="Mobile Money" value={money(summary.mobileMoneySales)} />
              {summary.cardSales ? <Row label="Bank Card" value={money(summary.cardSales)} /> : null}
              <Row label="Returns" value={money(-Math.abs(summary.returns))} tone="red" />
              <View className="my-2 border-t border-gray-200" />
              <Row label="Total Sales" value={money(netSales)} tone="green" bold />
              <View className="my-2 border-t border-gray-200" />
              <Row label="Expected Cash" value={money(summary.expectedCash)} tone="green" />
              <Row label="Expected Mobile Money" value={money(summary.expectedMobileMoney ?? 0)} tone="green" />
              <Row label="Actual Cash">
                <View className="h-11 min-w-[150px] justify-center rounded-lg border border-gray-300 px-3">
                  <TextInput value={actualCash} onChangeText={setActualCash} keyboardType="decimal-pad" placeholder="Enter amount" placeholderTextColor="#8A93A2" className="text-right text-[16px] font-semibold text-green-700" />
                </View>
              </Row>
              <Row label="Difference" value={difference === null ? '—' : money(difference)} tone={difference !== null && difference < 0 ? 'red' : 'green'} />
              <Pressable onPress={handleClose} disabled={submitting || !hasActual} className="mt-5 min-h-[58px] items-center justify-center rounded-xl bg-brand disabled:opacity-40"><Text className="text-[18px] font-bold text-white">{submitting ? 'Closing…' : 'Close Shift'}</Text></Pressable>
            </>
          )}
        </View>
      </View>
      <ReferenceBottomBar active="Home" onNavigate={goTab} />
    </SafeAreaView>
  );
}
