import { apiClient } from './client';
import { useAuthStore } from '../store/authStore';

export interface Branch {
  id: number;
  name: string;
  code: string;
  location?: string | null;
  address?: string | null;
  phone?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  isDefault?: boolean;
  bhfId?: string | null;
  _count?: { sales: number; batches: number; userBranches: number };
}

export async function getBranches(organizationId?: number): Promise<Branch[]> {
  const id = organizationId ?? useAuthStore.getState().activeOrganizationId;
  if (!id) throw new Error('No active organization');
  const { data } = await apiClient.get(`/branches/${id}`);
  return data;
}

export async function getUserBranches(organizationId?: number): Promise<Branch[]> {
  const id = organizationId ?? useAuthStore.getState().activeOrganizationId;
  const { data } = await apiClient.get('/branches/user/all', {
    params: { organizationId: id ?? undefined },
  });
  return data;
}