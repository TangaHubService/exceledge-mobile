import { apiClient } from './client';
import { useAuthStore } from '../store/authStore';

export interface Product {
  id: number;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  batchNumber?: string | null;
  category?: string | null;
  description?: string | null;
  unitPrice: number;
  costPrice?: number | null;
  quantity: number;
  minStock?: number | null;
  expiryDate?: string | null;
  imageUrl?: string | null;
  itemType?: 'PRODUCT' | 'SERVICE';
  taxCategory?: string;
  taxCode?: string | null;
  measurementUnit?: string;
  isActive?: boolean;
}

interface ProductsResponse {
  data: Product[];
  lowStockProducts: number;
  expiredProducts: number;
  expiringProducts: number;
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
}

function orgId(): number {
  const id = useAuthStore.getState().activeOrganizationId;
  if (!id) throw new Error('No active organization');
  return id;
}

export async function getProducts(params: {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  branchId?: number | null;
}): Promise<ProductsResponse> {
  const { data } = await apiClient.get(`/inventory/products/${orgId()}`, {
    params: {
      search: params.search || undefined,
      category: params.category || undefined,
      page: params.page || 1,
      limit: params.limit || 100,
      branchId: params.branchId ?? undefined,
    },
  });
  return data?.data ?? data;
}

export async function getProductCategories(branchId?: number | null): Promise<string[]> {
  const { data } = await apiClient.get(`/inventory/products/${orgId()}`, {
    params: { page: 1, limit: 200, branchId: branchId ?? undefined },
  });
  const res = data?.data ?? data;
  const categories = (res?.data ?? []).map((p: Product) => p.category).filter(Boolean) as string[];
  return Array.from(new Set(categories)).sort();
}