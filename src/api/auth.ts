import { apiClient } from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface OrganizationSummary {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  businessType?: string | null;
  role: string;
  isOwner: boolean;
  hasActiveSubscription: boolean;
  subscriptionStatus?: string | null;
  subscriptionEndDate?: string | null;
  daysUntilExpiry?: number | null;
  graceDaysRemaining?: number | null;
  graceDayLabel?: string | null;
  subscriptionWarningLevel?: string | null;
  subscriptionWarningMessage?: string | null;
  branches?: number[];
  activeBranchId?: number | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    requirePasswordChange: boolean;
  };
  organizations: OrganizationSummary[];
  hasOrganization: boolean;
  activeBranchId: number | null;
  branchIds: number[];
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
  return data;
}

export interface ApiMessageResponse {
  message: string;
}

export async function requestPasswordReset(payload: { email: string }): Promise<ApiMessageResponse> {
  const { data } = await apiClient.post<ApiMessageResponse>('/auth/request-password-reset', payload);
  return data;
}

export async function verifyPasswordResetCode(payload: {
  email: string;
  code: string;
}): Promise<ApiMessageResponse> {
  const { data } = await apiClient.post<ApiMessageResponse>('/auth/verify-password-reset-code', payload);
  return data;
}

export async function resetPassword(payload: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<ApiMessageResponse> {
  const { data } = await apiClient.post<ApiMessageResponse>('/auth/reset-password', payload);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // best-effort server invalidation
  }
}

export interface CurrentUserProfile {
  user: LoginResponse['user'];
  organizations: OrganizationSummary[];
}

// GET /auth/me returns a flat object (id, name, role, organizations, ...),
// not the { user, organizations } shape login uses — reshape it here so
// callers get the same session shape regardless of which endpoint fetched it.
export async function getCurrentUser(): Promise<CurrentUserProfile> {
  const { data } = await apiClient.get('/auth/me');
  return {
    user: {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      requirePasswordChange: data.requirePasswordChange,
    },
    organizations: data.organizations ?? [],
  };
}
