import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore, isFullBranchAccessRole } from '../../store/authStore';
import { useShiftStore } from '../../store/shiftStore';
import { getBranches, getUserBranches } from '../../api/branches';
import { getActiveShift, openShift } from '../../api/shifts';
import type { Branch } from '../../api/branches';
import { colors } from '../../theme';
import { ReferenceBottomBar, type ReferenceTab } from '../../components/ReferenceChrome';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function SelectField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 ml-3 text-[14px] text-gray-700">{label}</Text>
      <Pressable
        onPress={onPress}
        className="min-h-[52px] flex-row items-center rounded-lg border border-border bg-white px-4"
      >
        <Text numberOfLines={1} className="flex-1 text-[17px] font-bold text-gray-950">{value}</Text>
        <Ionicons name="chevron-down" size={22} color="#949996" />
      </Pressable>
    </View>
  );
}

export default function OpenShiftScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const organizations = useAuthStore((s) => s.organizations);
  const activeOrganizationId = useAuthStore((s) => s.activeOrganizationId);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const setActiveBranch = useAuthStore((s) => s.setActiveBranch);
  const setActiveShift = useShiftStore((s) => s.setActiveShift);

  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<number | null>(null);
  const [floatText, setFloatText] = useState('100,000');
  const [branchModal, setBranchModal] = useState(false);

  const organization = organizations.find((o) => o.id === activeOrganizationId);
  const orgRole = organization?.role ?? user?.role;
  const fullBranchAccess = isFullBranchAccessRole(orgRole);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Check the server for the cashier's open shift before loading form data.
      // Resuming an existing shift must not depend on the branches request.
      const shift = await getActiveShift();
      if (shift) {
        setActiveShift(shift);
        await setActiveBranch(shift.branchId);
        // The backend shift is authoritative. Resume it immediately instead of
        // making the cashier confirm an "Open Shift" screen after every login.
        navigation.replace('AppTabs');
        return;
      }

      // Limited roles only ever see the branches they were invited to.
      const branchList = fullBranchAccess
        ? await getBranches(activeOrganizationId ?? undefined)
        : await getUserBranches(activeOrganizationId ?? undefined);
      setBranches(branchList);
      setActiveShift(null);
      const preferred = branchList.find((branch) => branch.id === activeBranchId)
        ?? branchList.find((branch) => branch.isPrimary)
        ?? branchList[0];
      setBranchId(preferred?.id ?? null);
      if (preferred?.id) await setActiveBranch(preferred.id);
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Unable to load. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [activeOrganizationId, activeBranchId, fullBranchAccess, navigation, setActiveBranch, setActiveShift]);

  useEffect(() => {
    if (activeOrganizationId) {
      load();
    } else {
      // No organization resolved for this account — without this branch the
      // screen keeps its initial `loading: true` forever (load() is never
      // called), leaving the cashier stuck on a spinner with no way out.
      setLoading(false);
      setError('No organization found for your account. Please log out and sign in again.');
    }
  }, [activeOrganizationId, load]);

  const selectedBranch = branches.find((branch) => branch.id === branchId);

  const goTab = (tab: ReferenceTab) => navigation.navigate('AppTabs', { screen: tab });

  const handleOpen = async () => {
    if (!branchId) {
      setError('Select the branch where you are working.');
      return;
    }

    const openingFloat = Math.max(0, Number(floatText.replace(/,/g, '')) || 0);
    setOpening(true);
    setError(null);
    try {
      const shift = await openShift({ openingFloat, branchId });
      await setActiveBranch(branchId);
      setActiveShift(shift);
      navigation.replace('AppTabs');
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Failed to open shift.');
    } finally {
      setOpening(false);
    }
  };

  const updateOpeningCash = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setFloatText(digits ? Number(digits).toLocaleString('en-US') : '');
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <View className="h-[78px] flex-row items-center px-6">
        <Pressable
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          className="mr-8 h-11 w-11 items-center justify-center"
          hitSlop={10}
        >
          <Ionicons name="arrow-back" size={29} color="#fff" />
        </Pressable>
        <Text className="text-[22px] font-bold text-white">Open Shift</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 overflow-hidden rounded-t-[18px] bg-white"
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.brand.DEFAULT} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {error ? (
              <View className="mb-4 rounded-lg bg-red-50 px-4 py-3">
                <Text className="text-[13px] text-red-600">{error}</Text>
              </View>
            ) : null}

            <SelectField
              label="Branch"
              value={selectedBranch?.name ?? 'Select branch'}
              onPress={() => setBranchModal(true)}
            />
            {!fullBranchAccess && branches.length === 0 ? (
              <View className="mb-4 rounded-lg bg-amber-50 px-4 py-3">
                <Text className="text-[13px] font-medium leading-5 text-amber-800">
                  No branch has been assigned to your account yet. Ask your organization admin to assign you to a
                  branch before you can open a shift.
                </Text>
              </View>
            ) : null}
            <SelectField label="Cashier" value={user?.name ?? 'Cashier'} />
            <SelectField label="POS / Terminal" value="POS-01" />

            <View className="mb-5">
              <Text className="mb-1.5 ml-3 text-[14px] text-gray-700">Opening Cash (RWF)</Text>
              <TextInput
                value={floatText}
                onChangeText={updateOpeningCash}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.text.muted}
                className="min-h-[52px] rounded-lg border border-border bg-white px-4 text-[17px] font-bold text-gray-950"
              />
            </View>

            <Pressable
              onPress={handleOpen}
              disabled={!branchId || opening}
              className="min-h-[52px] items-center justify-center rounded-lg bg-brand disabled:opacity-50"
            >
              {opening ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-[18px] font-bold text-white">Open Shift</Text>
              )}
            </Pressable>
            {!branchId ? (
              <Text className="mt-2 text-center text-[13px] text-gray-500">
                {branches.length === 0 ? 'Select a branch to continue' : 'Select the branch where you are working'}
              </Text>
            ) : null}

            <View className="mt-10 flex-row items-center px-4">
              <Ionicons name="checkbox-outline" size={23} color={colors.brand.DEFAULT} />
              <Text className="ml-4 flex-1 text-[15px] text-gray-700">
                Opening your shift allows you to start sales
              </Text>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      <ReferenceBottomBar active="Home" onNavigate={goTab} />

      <Modal
        visible={branchModal}
        transparent
        animationType="fade"
        onRequestClose={() => setBranchModal(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setBranchModal(false)}
        >
          <Pressable className="rounded-t-[18px] bg-white px-5 pb-8 pt-5" onPress={() => {}}>
            <Text className="mb-3 text-[17px] font-bold text-gray-950">Select branch</Text>
            {branches.length === 0 ? (
              <Text className="py-6 text-center text-[14px] leading-6 text-gray-600">
                No branch has been assigned to your account. Contact your organization admin to assign you to a branch.
              </Text>
            ) : (
              branches.map((branch) => (
                <Pressable
                  key={branch.id}
                  onPress={() => {
                    setBranchId(branch.id);
                    setBranchModal(false);
                  }}
                  className="flex-row items-center border-b border-gray-100 py-4"
                >
                  <Text className="flex-1 text-[15px] font-semibold text-gray-800">{branch.name}</Text>
                  {branch.id === branchId ? (
                    <Ionicons name="checkmark" size={21} color={colors.brand.DEFAULT} />
                  ) : null}
                </Pressable>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
