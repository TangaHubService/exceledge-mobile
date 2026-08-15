import { apiClient } from './client';
import { useAuthStore } from '../store/authStore';

export interface HeldSaleItem {
  productId?: number;
  name?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  itemType?: 'PRODUCT' | 'SERVICE';
  serviceName?: string;
  imageUrl?: string | null;
  stock?: number;
}

export interface HeldSale {
  id: number;
  reference: string;
  totalAmount: number;
  itemCount: number;
  cartSnapshot: HeldSaleItem[];
  customerSnapshot?: { id?: number; name?: string; phone?: string | null; TIN?: string | null } | null;
  createdAt: string;
  branchId: number;
  user?: { id: number; name: string } | null;
}

function orgId(): number {
  const id = useAuthStore.getState().activeOrganizationId;
  if (!id) throw new Error('No active organization');
  return id;
}

export async function getHeldSales(): Promise<HeldSale[]> {
  const { data } = await apiClient.get(`/held-sales/${orgId()}`);
  return data ?? [];
}

export async function createHeldSale(input: {
  items: HeldSaleItem[];
  customer?: { id?: number; name?: string; phone?: string | null; TIN?: string | null } | null;
  shiftId?: number;
}): Promise<HeldSale> {
  const { data } = await apiClient.post(`/held-sales/${orgId()}`, input);
  return data ?? {};
}

export async function resumeHeldSale(id: number): Promise<HeldSale> {
  const { data } = await apiClient.post(`/held-sales/${orgId()}/${id}/resume`);
  return data ?? {};
}

export async function cancelHeldSale(id: number): Promise<{ message: string }> {
  const { data } = await apiClient.delete(`/held-sales/${orgId()}/${id}`);
  return data ?? {};
}
