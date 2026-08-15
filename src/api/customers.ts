import { apiClient } from './client';
import { useAuthStore } from '../store/authStore';

export interface Customer {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  customerType?: 'INDIVIDUAL' | 'INSURANCE' | 'CORPORATE';
  TIN?: string | null;
  balance: number;
  isActive?: boolean;
  _count?: { sales: number };
}

export interface CreateCustomerInput {
  name: string;
  phone?: string;
  email?: string;
  type?: 'INDIVIDUAL' | 'INSURANCE' | 'CORPORATE';
  TIN?: string;
  balance?: number;
}

function orgId(): number {
  const id = useAuthStore.getState().activeOrganizationId;
  if (!id) throw new Error('No active organization');
  return id;
}

export async function getCustomers(params: {
  search?: string;
  page?: number;
  limit?: number;
  hasDebt?: boolean;
}): Promise<{ customers: Customer[]; count: number; totalPages: number }> {
  const { data } = await apiClient.get(`/customers/${orgId()}`, {
    params: {
      search: params.search || undefined,
      page: params.page || 1,
      limit: params.limit || 100,
      hasDebt: params.hasDebt ? 'true' : undefined,
    },
  });
  return data;
}

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const { data } = await apiClient.post(`/customers/${orgId()}`, input);
  return data;
}

const WALK_IN_NAME = 'Walk-in Customer';

export async function ensureWalkInCustomer(): Promise<Customer> {
  const res = await getCustomers({ search: WALK_IN_NAME, limit: 10 });
  const existing = res.customers.find(
    (c) => c.name.toLowerCase() === WALK_IN_NAME.toLowerCase()
  );
  if (existing) return existing;
  return createCustomer({ name: WALK_IN_NAME, type: 'INDIVIDUAL', balance: 0 });
}