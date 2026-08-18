import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { getOrgSettings, updateOrgSettings, DEFAULT_ENABLED_PAYMENT_METHODS } from '../../api/orgSettings';
import { colors } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type PayMethodKey = 'CASH' | 'MOBILE_MONEY' | 'CARD' | 'BANK_TRANSFER' | 'DEBT';

const METHODS: Array<{ key: PayMethodKey; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'CASH', label: 'Cash', description: 'Pay with cash', icon: 'cash-outline' },
  { key: 'MOBILE_MONEY', label: 'Mobile Money', description: 'MTN MoMo or Airtel Money', icon: 'phone-portrait-outline' },
  { key: 'CARD', label: 'Bank Card', description: 'Visa, Mastercard or Verve', icon: 'card-outline' },
  { key: 'BANK_TRANSFER', label: 'Bank Transfer', description: 'Pay directly from a bank account', icon: 'business-outline' },
  { key: 'DEBT', label: 'Credit Sale', description: 'Record as a credit sale', icon: 'receipt-outline' },
];

export default function PaymentMethodsScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({ queryKey: ['org-settings'], queryFn: getOrgSettings });
  const [enabled, setEnabled] = useState<PayMethodKey[] | null>(null);

  const enabledMethods = enabled ?? (settingsQuery.data?.preferences.enabledPaymentMethods as PayMethodKey[]) ?? DEFAULT_ENABLED_PAYMENT_METHODS;

  const saveMutation = useMutation({
    mutationFn: (methods: PayMethodKey[]) =>
      updateOrgSettings({ preferences: { enabledPaymentMethods: methods } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-settings'] });
      Alert.alert('Saved', 'Payment methods updated for this organization.');
    },
    onError: (error: any) => {
      Alert.alert('Could not save', error?.response?.data?.error ?? error?.message ?? 'Please try again.');
    },
  });

  const enabledCount = enabledMethods.length;
  const toggle = (key: PayMethodKey) => {
    setEnabled((prev) => {
      const current = prev ?? (settingsQuery.data?.preferences.enabledPaymentMethods as PayMethodKey[]) ?? DEFAULT_ENABLED_PAYMENT_METHODS;
      const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
      return next;
    });
  };

  const canSave = useMemo(() => {
    if (enabled === null || enabled.length === 0 || saveMutation.isPending) return false;
    const initial = (settingsQuery.data?.preferences.enabledPaymentMethods as PayMethodKey[]) ?? DEFAULT_ENABLED_PAYMENT_METHODS;
    const same = enabled.length === initial.length && enabled.every((k) => initial.includes(k));
    return !same;
  }, [enabled, saveMutation.isPending, settingsQuery.data]);

  const handleSave = () => {
    if (!enabled || enabled.length === 0) return;
    saveMutation.mutate(enabled);
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="h-[76px] flex-row items-center px-5">
        <Pressable onPress={() => navigation.goBack()} className="mr-6 h-11 w-11 items-center justify-center" hitSlop={10}><Ionicons name="arrow-back" size={30} color="#fff" /></Pressable>
        <Text className="text-[22px] font-bold text-white">Payment Methods</Text>
      </View>

      <View className="flex-1 bg-[#F8F9F8] p-4">
        {settingsQuery.isLoading ? (
          <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.brand.DEFAULT} /></View>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <View className="overflow-hidden rounded-xl border border-gray-100 bg-white" style={{ shadowColor: '#0B241A', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
              {METHODS.map((method, index) => {
                const isOn = enabledMethods.includes(method.key);
                return (
                  <View key={method.key} className={`flex-row items-center px-4 py-4 ${index ? 'border-t border-gray-100' : ''}`}>
                    <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-light">
                      <Ionicons name={method.icon} size={24} color={colors.brand.dark} />
                    </View>
                    <View className="ml-4 flex-1 pr-3">
                      <Text className="text-[15px] font-semibold text-gray-950">{method.label}</Text>
                      <Text className="mt-0.5 text-[13px] text-[#596579]">{method.description}</Text>
                    </View>
                    <Switch
                      value={isOn}
                      onValueChange={() => toggle(method.key)}
                      trackColor={{ false: '#E3E5E2', true: colors.brand.solid }}
                      thumbColor="#fff"
                    />
                  </View>
                );
              })}
            </View>

            {enabledCount === 0 ? (
              <View className="mt-4 flex-row items-start rounded-lg border border-red-200 bg-red-50 p-3">
                <Ionicons name="alert-circle-outline" size={21} color="#B42318" />
                <Text className="ml-2 flex-1 text-[13px] leading-5 text-red-800">At least one payment method must be enabled at checkout.</Text>
              </View>
            ) : null}

            <View className="mt-4 flex-row items-start rounded-lg border border-gray-100 bg-white p-3">
              <Ionicons name="information-circle-outline" size={21} color={colors.brand.dark} />
              <Text className="ml-2 flex-1 text-[13px] leading-5 text-[#596579]">
                Methods shown here appear on the checkout screen for this organization. Cashier choices are still validated by the backend.
              </Text>
            </View>

            <Pressable onPress={handleSave} disabled={!canSave || saveMutation.isPending} className="mt-5 min-h-[52px] flex-row items-center justify-center rounded-lg bg-brand disabled:opacity-50">
              {saveMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text className="text-[16px] font-bold text-white">Save Payment Methods</Text>}
            </Pressable>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}