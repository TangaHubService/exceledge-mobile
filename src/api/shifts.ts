import { apiClient } from './client';
import { useAuthStore } from '../store/authStore';

export interface Shift {
  id: number;
  shiftNumber?: string | null;
  organizationId: number;
  branchId: number;
  userId: number;
  deviceId?: number | null;
  openingFloat: number;
  openingMobileMoney?: number | null;
  openingNotes?: string | null;
  status: 'OPEN' | 'CLOSING' | 'PENDING_APPROVAL' | 'CLOSED' | 'REOPENED' | 'CANCELLED';
  openedAt: string;
  closedAt?: string | null;
  expectedCash?: number | null;
  actualCash?: number | null;
  actualMobileMoney?: number | null;
  difference?: number | null;
  closingNotes?: string | null;
  approvalDecision?: string | null;
  approvalReason?: string | null;
}

export interface ShiftSummary {
  openingFloat: number;
  openingMobileMoney: number;
  grossSales: number;
  cashSales: number;
  mobileMoneySales: number;
  cardSales: number;
  creditSales: number;
  returns: number;
  discounts: number;
  expectedCash: number;
  expectedMobileMoney: number;
}

function orgId(): number {
  const id = useAuthStore.getState().activeOrganizationId;
  if (!id) throw new Error('No active organization');
  return id;
}

export async function openShift(input: {
  openingFloat: number;
  openingMobileMoney?: number;
  branchId?: number | null;
  deviceId?: number;
  openingNotes?: string;
}): Promise<Shift> {
  const { data } = await apiClient.post(`/shifts/${orgId()}`, {
    openingFloat: input.openingFloat,
    openingMobileMoney: input.openingMobileMoney ?? 0,
    branchId: input.branchId ?? undefined,
    deviceId: input.deviceId ?? undefined,
    openingNotes: input.openingNotes ?? undefined,
  });
  return data;
}

export async function getActiveShift(): Promise<Shift | null> {
  try {
    const { data } = await apiClient.get(`/shifts/${orgId()}/active`);
    return data;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}

export async function getShiftSummary(id: number): Promise<{ shift: Shift; summary: ShiftSummary }> {
  const { data } = await apiClient.get(`/shifts/${orgId()}/${id}/summary`);
  return data;
}

export async function closeShift(
  id: number,
  input: { actualCash: number; closingNotes?: string }
): Promise<{ shift: Shift; summary: ShiftSummary & { actualCash: number; difference: number }; needsApproval?: boolean }> {
  const { data } = await apiClient.put(`/shifts/${orgId()}/${id}/close`, input);
  return data;
}

export async function submitClose(
  id: number,
  input: {
    actualCash: number;
    actualMobileMoney?: number;
    varianceReason?: string;
    closingNotes?: string;
    denominationCounts?: Record<string, number>;
  }
): Promise<{ shift: Shift; summary: ShiftSummary & { actualCash: number; difference: number }; needsApproval?: boolean }> {
  const { data } = await apiClient.post(`/shifts/${orgId()}/${id}/submit-close`, input);
  return data;
}

export async function startClose(id: number): Promise<{ shift: Shift; summary: ShiftSummary }> {
  const { data } = await apiClient.post(`/shifts/${orgId()}/${id}/start-close`);
  return data;
}