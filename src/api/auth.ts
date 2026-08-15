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

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // best-effort server invalidation
  }
}

export async function getCurrentUser(): Promise<LoginResponse['user']> {
  const { data } = await apiClient.get('/auth/me');
  return data?.user ?? data ?? null;
}