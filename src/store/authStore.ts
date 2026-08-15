import { create } from 'zustand';
import { secureStorage } from './secureStorage';
import type { LoginResponse, OrganizationSummary } from '../api/auth';

const ACCESS_TOKEN_KEY = 'excel_edge_access_token';
const REFRESH_TOKEN_KEY = 'excel_edge_refresh_token';
const ACTIVE_ORG_KEY = 'excel_edge_active_org';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  requirePasswordChange?: boolean;
}

interface AuthState {
  isHydrated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  organizations: OrganizationSummary[];
  activeOrganizationId: number | null;
  activeBranchId: number | null;
  hydrate: () => Promise<void>;
  setSession: (data: LoginResponse) => Promise<void>;
  setActiveOrganization: (orgId: number) => Promise<void>;
  setActiveBranch: (branchId: number | null) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isHydrated: false,
  accessToken: null,
  refreshToken: null,
  user: null,
  organizations: [],
  activeOrganizationId: null,
  activeBranchId: null,

  hydrate: async () => {
    const [accessToken, refreshToken, storedOrg] = await Promise.all([
      secureStorage.getItem(ACCESS_TOKEN_KEY),
      secureStorage.getItem(REFRESH_TOKEN_KEY),
      secureStorage.getItem(ACTIVE_ORG_KEY),
    ]);
    set({ accessToken, refreshToken, isHydrated: true, activeOrganizationId: storedOrg ? Number(storedOrg) : null });
  },

  setSession: async (data) => {
    await Promise.all([
      secureStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken),
      secureStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken),
    ]);
    // Default to the user's primary (first) organization.
    const primary = data.organizations?.[0]?.id ?? null;
    if (primary) {
      await secureStorage.setItem(ACTIVE_ORG_KEY, String(primary));
    }
    set({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
      organizations: data.organizations ?? [],
      activeOrganizationId: primary,
      activeBranchId: data.activeBranchId ?? null,
    });
  },

  setActiveOrganization: async (orgId) => {
    await secureStorage.setItem(ACTIVE_ORG_KEY, String(orgId));
    const org = get().organizations.find((o) => o.id === orgId);
    set({
      activeOrganizationId: orgId,
      activeBranchId: org?.activeBranchId ?? null,
    });
  },

  setActiveBranch: async (branchId) => {
    set({ activeBranchId: branchId });
  },

  logout: async () => {
    await Promise.all([
      secureStorage.removeItem(ACCESS_TOKEN_KEY),
      secureStorage.removeItem(REFRESH_TOKEN_KEY),
      secureStorage.removeItem(ACTIVE_ORG_KEY),
    ]);
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      organizations: [],
      activeOrganizationId: null,
      activeBranchId: null,
    });
  },
}));