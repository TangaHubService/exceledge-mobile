import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useSecurityStore, AUTO_LOCK_OPTIONS } from '../../store/securityStore';
import { colors } from '../../theme';
import { toast } from '../../utils/toast';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const LOCK_LABELS: Record<number, string> = { 0: 'Never', 1: '1 min', 5: '5 min', 15: '15 min', 60: '1 hour' };

export default function SecurityScreen() {
  const navigation = useNavigation<Nav>();
  const hasPin = useSecurityStore((s) => s.hasPin);
  const pinEnabled = useSecurityStore((s) => s.pinEnabled);
  const autoLockMinutes = useSecurityStore((s) => s.autoLockMinutes);
  const setPin = useSecurityStore((s) => s.setPin);
  const setPinEnabled = useSecurityStore((s) => s.setPinEnabled);
  const setAutoLockMinutes = useSecurityStore((s) => s.setAutoLockMinutes);
  const clearPin = useSecurityStore((s) => s.clearPin);

  const [pinModal, setPinModal] = useState(false);
  const [pin, setPinValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pinModal) {
      setPinValue('');
      setConfirm('');
      setSaving(false);
    }
  }, [pinModal]);

  const savePin = async () => {
    if (pin.length < 4 || confirm.length < 4) {
      toast.warning('Incomplete PIN', 'Enter a 4-digit PIN in both fields.');
      return;
    }
    if (pin !== confirm) {
      toast.warning('PINs do not match', 'Please re-enter the same PIN in both fields.');
      return;
    }
    setSaving(true);
    try {
      await setPin(pin);
      setPinModal(false);
      toast.success(hasPin ? 'PIN updated' : 'PIN set', 'Your PIN has been saved.');
    } catch (error: any) {
      toast.error('Could not save PIN', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const removePin = () => {
    Alert.alert('Remove PIN?', 'App lock will be disabled.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove PIN', style: 'destructive', onPress: () => clearPin() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="h-[76px] flex-row items-center px-5">
        <Pressable onPress={() => navigation.goBack()} className="mr-6 h-11 w-11 items-center justify-center" hitSlop={10}><Ionicons name="arrow-back" size={30} color="#fff" /></Pressable>
        <Text className="text-[22px] font-bold text-white">Security</Text>
      </View>

      <ScrollView className="bg-[#F8F9F8]" contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View className="overflow-hidden rounded-xl border border-gray-100 bg-white" style={{ shadowColor: '#0B241A', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <Pressable onPress={() => setPinModal(true)} className="flex-row items-center border-b border-gray-100 px-4 py-4">
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-brand-light">
              <Ionicons name="keypad-outline" size={25} color={colors.brand.dark} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-[16px] font-extrabold text-gray-950">{hasPin ? 'Change PIN' : 'Set PIN'}</Text>
              <Text className="mt-1 text-[13px] text-[#596579]">{hasPin ? 'Update your 4-digit app PIN' : 'Create a 4-digit PIN to lock this app'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={23} color="#596579" />
          </Pressable>

          {hasPin ? (
            <View className="flex-row items-center px-4 py-4">
              <View className="flex-1 pr-4">
                <Text className="text-[15px] font-semibold text-gray-950">Require PIN on app start</Text>
                <Text className="mt-1 text-[13px] text-[#596579]">Lock this device when the app is opened.</Text>
              </View>
              <Switch
                value={pinEnabled}
                onValueChange={(value) => {
                  if (!value) {
                    Alert.alert('Disable lock?', 'The app will no longer require a PIN on start.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Disable', onPress: () => setPinEnabled(false) },
                    ]);
                    return;
                  }
                  setPinEnabled(true);
                }}
                trackColor={{ false: '#E3E5E2', true: colors.brand.solid }}
                thumbColor="#fff"
              />
            </View>
          ) : null}

          {hasPin ? (
            <View className="border-t border-gray-100 px-4 py-4">
              <Text className="text-[15px] font-semibold text-gray-950">Auto-lock</Text>
              <Text className="mt-1 text-[13px] text-[#596579]">Lock automatically after the app has been idle this long.</Text>
              <View className="mt-3 flex-row flex-wrap" style={{ gap: 8 }}>
                {AUTO_LOCK_OPTIONS.map((minutes) => {
                  const selected = minutes === autoLockMinutes;
                  return (
                    <Pressable
                      key={minutes}
                      onPress={() => setAutoLockMinutes(minutes)}
                      className={`rounded-full border px-4 py-2 ${selected ? 'border-brand bg-brand-light' : 'border-gray-200 bg-white'}`}
                    >
                      <Text className={`text-[13px] font-semibold ${selected ? 'text-brand-dark' : 'text-gray-600'}`}>{LOCK_LABELS[minutes]}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        {hasPin ? (
          <Pressable onPress={removePin} className="mt-4 flex-row items-center rounded-xl border border-red-100 bg-white px-4 py-4" style={{ shadowColor: '#0B241A', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
            <View className="h-12 w-12 items-center justify-center rounded-xl bg-red-50">
              <Ionicons name="trash-outline" size={24} color={colors.danger} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-[16px] font-extrabold text-red-600">Remove PIN</Text>
              <Text className="mt-1 text-[13px] text-[#596579]">Turn off app lock entirely.</Text>
            </View>
            <Ionicons name="chevron-forward" size={23} color="#596579" />
          </Pressable>
        ) : null}

        <View className="mt-4 flex-row items-start rounded-xl border border-gray-100 bg-white p-4" style={{ shadowColor: '#0B241A', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 }}>
          <Ionicons name="finger-print-outline" size={22} color={colors.brand.dark} />
          <View className="ml-3 flex-1">
            <Text className="text-[15px] font-semibold text-gray-950">Biometric unlock</Text>
            <Text className="mt-1 text-[13px] leading-5 text-[#596579]">
              Face ID / fingerprint unlock is not enabled in this build. Your PIN is stored in the device's secure, encrypted storage.
            </Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={pinModal} transparent animationType="fade" onRequestClose={() => setPinModal(false)}>
        <Pressable className="flex-1 justify-center px-8" onPress={() => setPinModal(false)} style={{ backgroundColor: colors.overlay }}>
          <Pressable className="rounded-xl bg-white p-5" onPress={() => {}}>
            <Text className="text-[18px] font-bold text-gray-950">{hasPin ? 'Change PIN' : 'Set a PIN'}</Text>
            <Text className="mt-1 text-[13px] text-[#596579]">Use 4 digits. You will need this PIN to unlock the app.</Text>

            <Text className="mb-1.5 mt-4 ml-3 text-[13px] font-semibold text-gray-700">New PIN</Text>
            <TextInput
              value={pin}
              onChangeText={(t) => setPinValue(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="••••"
              className="h-[52px] rounded-lg border border-gray-200 bg-white px-4 text-center text-[20px] font-bold tracking-[8px]"
            />
            <Text className="mb-1.5 mt-4 ml-3 text-[13px] font-semibold text-gray-700">Confirm PIN</Text>
            <TextInput
              value={confirm}
              onChangeText={(t) => setConfirm(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="••••"
              className="h-[52px] rounded-lg border border-gray-200 bg-white px-4 text-center text-[20px] font-bold tracking-[8px]"
            />

            <Pressable onPress={savePin} disabled={saving} className="mt-5 min-h-[50px] items-center justify-center rounded-lg bg-brand disabled:opacity-50">
              <Text className="text-[16px] font-bold text-white">{saving ? 'Saving…' : 'Save PIN'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}