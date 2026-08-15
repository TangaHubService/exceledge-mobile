import { apiClient } from './client';
import { useAuthStore } from '../store/authStore';

export interface Shift {
  id: number;
  organizationId: number;
  branchId: number;
  userId: number;
  deviceId?: number | null;
  openingFloat: number;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string | null;
  expectedCash?: number | null;
  actualCash?: number | null;
  difference?: number | null;
  closingNotes?: string | null;
}

export interface ShiftSummary {
  openingFloat: number;
  grossSales: number;
  cashSales: number;
  mobileMoneySales: number;
  cardSales: number;
  creditSales: number;
  returns: number;
  discounts: number;
  expectedCash: number;
}

function orgId(): number {
  const id = useAuthStore.getState().activeOrganizationId;
  if (!id) throw new Error('No active organization');
  return id;
}

export async function openShift(input: {
  openingFloat: number;
  branchId?: number | null;
  deviceId?: number;
}): Promise<Shift> {
  const { data } = await apiClient.post(`/shifts/${orgId()}`, {
    openingFloat: input.openingFloat,
    branchId: input.branchId ?? undefined,
    deviceId: input.deviceId ?? undefined,
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
): Promise<{ shift: Shift; summary: ShiftSummary & { actualCash: number; difference: number } }> {
  const { data } = await apiClient.put(`/shifts/${orgId()}/${id}/close`, input);
  return data;
}