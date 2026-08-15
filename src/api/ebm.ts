import { apiClient } from './client';
import { useAuthStore } from '../store/authStore';

export type EbmOutboxStatus = 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'DEAD_LETTER';

export interface EbmOutboxEntry {
  id: number;
  saleId: number;
  operation: 'SALE' | 'REFUND' | 'VOID';
  status: EbmOutboxStatus;
  retryCount: number;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EbmStatus {
  enabled: boolean;
  online: boolean;
  lastContact: string | null;
  offlineLimitMs: number;
}

function orgId(): number {
  const id = useAuthStore.getState().activeOrganizationId;
  if (!id) throw new Error('No active organization');
  return id;
}

export async function getEbmStatus(): Promise<EbmStatus> {
  const { data } = await apiClient.get(`/organizations/${orgId()}/ebm-status`);
  return data?.data ?? data;
}

export async function getEbmOutboxForSale(saleId: number): Promise<EbmOutboxEntry[]> {
  const { data } = await apiClient.get(`/organizations/${orgId()}/ebm-outbox`, {
    params: { saleId },
  });
  return data?.data ?? data;
}

export async function getEbmOutbox(): Promise<EbmOutboxEntry[]> {
  const { data } = await apiClient.get(`/organizations/${orgId()}/ebm-outbox`);
  return data?.data ?? data ?? [];
}
