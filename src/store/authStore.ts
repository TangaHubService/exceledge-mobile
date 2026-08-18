import { create } from 'zustand';
import { secureStorage } from './secureStorage';
import { getCurrentUser } from '../api/auth';
import type { LoginResponse, OrganizationSummary } from '../api/auth';

const ACCESS_TOKEN_KEY = 'excel_edge_access_token';
const REFRESH_TOKEN_KEY = 'excel_edge_refresh_token';
const ACTIVE_ORG_KEY = 'excel_edge_active_org';
const ACTIVE_BRANCH_KEY = 'excel_edge_active_branch';

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
  updateTokens: (accessToken: string, refreshToken: string) => Promise<void>;
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
    const [accessToken, refreshToken, storedOrg, storedBranch] = await Promise.all([
      secureStorage.getItem(ACCESS_TOKEN_KEY),
      secureStorage.getItem(REFRESH_TOKEN_KEY),
      secureStorage.getItem(ACTIVE_ORG_KEY),
      secureStorage.getItem(ACTIVE_BRANCH_KEY),
    ]);
    set({
      accessToken,
      refreshToken,
      isHydrated: true,
      activeOrganizationId: storedOrg ? Number(storedOrg) : null,
      activeBranchId: storedBranch ? Number(storedBranch) : null,
    });

    // Only tokens and IDs are persisted to secure storage — `user` and
    // `organizations` reset to their defaults (null/[]) on every cold start.
    // Left unfixed, role checks like isFullBranchAccessRole() silently read
    // an undefined role after every app restart and treat every account as
    // branch-restricted, which can empty out the branch list on the Open
    // Shift screen. Refetch the profile here; best-effort so an offline
    // restart still leaves the session usable with cached tokens/IDs.
    if (accessToken) {
      try {
        const profile = await getCurrentUser();
        set({ user: profile.user, organizations: profile.organizations });
      } catch {
        // ignore — keep working with the persisted tokens/IDs only
      }
    }
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

  updateTokens: async (accessToken, refreshToken) => {
    // Refresh tokens are rotated by the backend, so both values must be
    // persisted together before the refreshed session is used again.
    await Promise.all([
      secureStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
      secureStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
    ]);
    set({ accessToken, refreshToken });
  },

  setActiveOrganization: async (orgId) => {
    await secureStorage.setItem(ACTIVE_ORG_KEY, String(orgId));
    const org = get().organizations.find((o) => o.id === orgId);
    const branchId = org?.activeBranchId ?? null;
    await secureStorage.setItem(ACTIVE_BRANCH_KEY, branchId ? String(branchId) : '');
    set({
      activeOrganizationId: orgId,
      activeBranchId: branchId,
    });
  },

  setActiveBranch: async (branchId) => {
    await secureStorage.setItem(ACTIVE_BRANCH_KEY, branchId ? String(branchId) : '');
    set({ activeBranchId: branchId });
  },

  logout: async () => {
    await Promise.all([
      secureStorage.removeItem(ACCESS_TOKEN_KEY),
      secureStorage.removeItem(REFRESH_TOKEN_KEY),
      secureStorage.removeItem(ACTIVE_ORG_KEY),
      secureStorage.removeItem(ACTIVE_BRANCH_KEY),
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

/**
 * Roles with unrestricted branch access at the organization level. All other
 * roles (BRANCH_MANAGER, ACCOUNTANT, SELLER, CASHIER, ...) are limited to the
 * branches they were assigned to when invited, matching the backend branchAuth
 * middleware.
 */
export const isFullBranchAccessRole = (role?: string | null): boolean =>
  role === 'SYSTEM_OWNER' || role === 'ADMIN';

/** Resolves the user's role within the currently active organization. */
export function selectActiveOrgRole(state: AuthState): string | null {
  const org = state.organizations.find((o) => o.id === state.activeOrganizationId);
  return org?.role ?? state.user?.role ?? null;
}
