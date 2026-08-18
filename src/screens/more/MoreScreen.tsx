import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore, isFullBranchAccessRole } from '../../store/authStore';
import { useShiftStore } from '../../store/shiftStore';
import { getBranches, getUserBranches } from '../../api/branches';
import { logout as apiLogout } from '../../api/auth';
import { Card, ScreenHeader } from '../../components/ui';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { colors, typography } from '../../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function MoreScreen() {
  const navigation = useNavigation<Nav>();
  const user = useAuthStore((s) => s.user);
  const organizations = useAuthStore((s) => s.organizations);
  const activeOrganizationId = useAuthStore((s) => s.activeOrganizationId);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const setActiveOrganization = useAuthStore((s) => s.setActiveOrganization);
  const setActiveBranch = useAuthStore((s) => s.setActiveBranch);
  const logout = useAuthStore((s) => s.logout);
  const activeShift = useShiftStore((s) => s.activeShift);
  const setActiveShift = useShiftStore((s) => s.setActiveShift);

  const [orgModal, setOrgModal] = useState(false);
  const [branchModal, setBranchModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const organization = organizations.find((o) => o.id === activeOrganizationId);
  const orgRole = organization?.role ?? user?.role;
  const fullBranchAccess = isFullBranchAccessRole(orgRole);

  // Full-access roles (ADMIN / SYSTEM_OWNER) see every branch. Everyone else is
  // limited to the branches they were assigned to when invited — selecting an
  // unassigned branch would be rejected by the backend branch authorization.
  const { data: allBranches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches', activeOrganizationId],
    queryFn: () => getBranches(activeOrganizationId ?? undefined),
    enabled: !!activeOrganizationId && fullBranchAccess,
  });
  const { data: userBranches = [], isLoading: userBranchesLoading } = useQuery({
    queryKey: ['user-branches', activeOrganizationId],
    queryFn: () => getUserBranches(activeOrganizationId ?? undefined),
    enabled: !!activeOrganizationId && !fullBranchAccess,
  });

  const branches = fullBranchAccess ? allBranches : userBranches;
  const loadingBranches = fullBranchAccess ? branchesLoading : userBranchesLoading;

  // Auto-join limited users to their primary (invited) branch.
  useEffect(() => {
    if (fullBranchAccess || userBranches.length === 0) return;
    const primary = userBranches.find((b) => b.isPrimary)?.id ?? userBranches[0].id;
    if (activeBranchId !== primary) setActiveBranch(primary);
  }, [fullBranchAccess, userBranches, activeBranchId, setActiveBranch]);

  const currentBranch = branches.find((b) => b.id === activeBranchId);

  const handleLogout = () => {
    Alert.alert('Log out?', 'You will need to sign in again to use Excel Edge POS.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await apiLogout().catch(() => {});
          setActiveShift(null);
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-brand-darker" edges={['top']}>
      <ScreenHeader title="Profile & Account" subtitle="Your profile, organization and branch" back onBack={() => navigation.goBack()} />
      <ScrollView className="bg-background" contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

        {/* Profile */}
        <Card>
          <View className="flex-row items-center">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-brand">
              <Text className="text-xl font-extrabold text-white">
                {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
              </Text>
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[16px] font-bold text-gray-900">{user?.name ?? 'User'}</Text>
              <Text style={typography.caption}>{user?.email}</Text>
              <Text className="mt-0.5 text-[11px] font-semibold text-brand-dark">{user?.role}</Text>
            </View>
          </View>
        </Card>

        {/* Organization */}
        <Text className="mb-2 mt-6 text-[13px] font-bold uppercase tracking-wide text-gray-400">Organization</Text>
        <Card className="p-0">
          <Pressable onPress={() => setOrgModal(true)} className="flex-row items-center px-4 py-4">
            <View className="h-10 w-10 items-center justify-center rounded-md bg-brand-light">
              <Ionicons name="business" size={18} color={colors.brand.DEFAULT} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-semibold text-gray-800">{organization?.name ?? '—'}</Text>
              <Text style={typography.caption}>
                {organization?.hasActiveSubscription ? 'Active subscription' : 'No active subscription'}
              </Text>
            </View>
            {organizations.length > 1 ? <Ionicons name="chevron-forward" size={16} color={colors.text.muted} /> : null}
          </Pressable>
          <View className="h-px bg-gray-50" />
          <Pressable onPress={() => setBranchModal(true)} className="flex-row items-center px-4 py-4">
            <View className="h-10 w-10 items-center justify-center rounded-md bg-brand-light">
              <Ionicons name="location" size={18} color={colors.brand.DEFAULT} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-semibold text-gray-800">{currentBranch?.name ?? 'Select branch'}</Text>
              <Text style={typography.caption}>
                {loadingBranches ? 'Loading branches…' : activeBranchId ? 'Branch for sales & stock' : fullBranchAccess ? 'Tap to choose your branch' : 'Your assigned branch'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
          </Pressable>
        </Card>

        {/* Shift */}
        <Text className="mb-2 mt-6 text-[13px] font-bold uppercase tracking-wide text-gray-400">Shift</Text>
        <Card className="p-0">
          <Pressable onPress={() => navigation.navigate('CloseShift')} className="flex-row items-center px-4 py-4">
            <View className="h-10 w-10 items-center justify-center rounded-md bg-brand-light">
              <Ionicons name="time" size={18} color={colors.brand.DEFAULT} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-semibold text-gray-800">
                {activeShift ? 'Shift is open' : 'No open shift'}
              </Text>
              <Text style={typography.caption}>
                {activeShift ? 'Tap to view summary and close' : 'Open a shift from the POS screen'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
          </Pressable>
        </Card>

        <Text className="mb-2 mt-6 text-[13px] font-bold uppercase tracking-wide text-gray-400">Sales tools</Text>
        <Card className="p-0">
          <Pressable onPress={() => navigation.navigate('HeldSales')} className="flex-row items-center px-4 py-4">
            <View className="h-10 w-10 items-center justify-center rounded-md bg-brand-light">
              <Ionicons name="pause-circle-outline" size={19} color={colors.brand.DEFAULT} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-semibold text-gray-800">Held Sales</Text>
              <Text style={typography.caption}>Continue or remove paused carts</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
          </Pressable>
          <View className="h-px bg-gray-50" />
          <Pressable onPress={() => navigation.navigate('StartReturn')} className="flex-row items-center px-4 py-4">
            <View className="h-10 w-10 items-center justify-center rounded-md bg-brand-light">
              <Ionicons name="return-down-back-outline" size={19} color={colors.brand.DEFAULT} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-semibold text-gray-800">Start Return</Text>
              <Text style={typography.caption}>Refund a completed sales invoice</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
          </Pressable>
        </Card>

        {/* Language */}
        <Text className="mb-2 mt-6 text-[13px] font-bold uppercase tracking-wide text-gray-400">Language</Text>
        <View className="items-start">
          <LanguageSwitcher dark={false} />
        </View>

        {/* Account */}
        <Text className="mb-2 mt-6 text-[13px] font-bold uppercase tracking-wide text-gray-400">Account</Text>
        <Card className="p-0">
          <Pressable onPress={handleLogout} className="flex-row items-center px-4 py-4">
            {loggingOut ? (
              <ActivityIndicator color={colors.danger} size="small" />
            ) : (
              <View className="h-10 w-10 items-center justify-center rounded-md bg-red-50">
                <Ionicons name="log-out" size={18} color={colors.danger} />
              </View>
            )}
            <Text className="ml-3 text-[15px] font-semibold text-red-600">Log out</Text>
          </Pressable>
        </Card>

        <Text style={typography.caption} className="mt-6 text-center">Excel Edge POS v1.0.0</Text>
      </ScrollView>

      {/* Org switcher */}
      <Modal visible={orgModal} transparent animationType="fade" onRequestClose={() => setOrgModal(false)}>
        <Pressable className="flex-1 justify-center px-8" onPress={() => setOrgModal(false)} style={{ backgroundColor: colors.overlay }}>
          <Pressable className="rounded-xl bg-white p-5" onPress={() => {}}>
            <Text style={typography.heading}>Switch organization</Text>
            {organizations.map((o) => (
              <Pressable
                key={o.id}
                onPress={async () => {
                  await setActiveOrganization(o.id);
                  setOrgModal(false);
                }}
                className={`mt-3 rounded-md border p-3.5 ${o.id === activeOrganizationId ? 'border-brand bg-brand-light' : 'border-border'}`}
              >
                <Text className={`text-[15px] font-semibold ${o.id === activeOrganizationId ? 'text-brand-dark' : 'text-gray-800'}`}>
                  {o.name}
                </Text>
                <Text style={typography.caption} className="mt-0.5">{o.role}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Branch switcher */}
      <Modal visible={branchModal} transparent animationType="fade" onRequestClose={() => setBranchModal(false)}>
        <Pressable className="flex-1 justify-center px-8" onPress={() => setBranchModal(false)} style={{ backgroundColor: colors.overlay }}>
          <Pressable className="rounded-xl bg-white p-5" onPress={() => {}}>
            <Text style={typography.heading}>Choose branch</Text>
            <Text style={typography.caption} className="mt-1">Branch-scoped products, stock and sales will use this branch.</Text>
            {loadingBranches ? (
              <View className="items-center py-10">
                <ActivityIndicator color={colors.brand.DEFAULT} />
              </View>
            ) : branches.length === 0 ? (
              <Text style={typography.body} className="py-8 text-center">
                {fullBranchAccess ? 'No branches available.' : 'No branch has been assigned to your account. Contact your organization admin.'}
              </Text>
            ) : (
              branches.map((b) => {
                const selected = b.id === activeBranchId;
                return (
                  <Pressable
                    key={b.id}
                    onPress={async () => {
                      await setActiveBranch(b.id);
                      setBranchModal(false);
                    }}
                    className={`mt-3 rounded-md border p-3.5 ${selected ? 'border-brand bg-brand-light' : 'border-border'}`}
                  >
                    <Text className={`text-[15px] font-semibold ${selected ? 'text-brand-dark' : 'text-gray-800'}`}>
                      {b.name}
                    </Text>
                    {b.location ? <Text style={typography.caption} className="mt-0.5">{b.location}</Text> : null}
                  </Pressable>
                );
              })
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
