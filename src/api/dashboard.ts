import { apiClient } from './client';
import { useAuthStore } from '../store/authStore';

export type DashboardPreset = 'today' | 'this_week' | 'this_month' | 'this_year';

interface SummaryMetric {
  value: number;
  changePercentage?: number;
  newCount?: number;
}

export interface DashboardOverview {
  currency: string;
  dateRange: {
    preset: string;
    startDate: string;
    endDate: string;
  };
  summary?: {
    totalSales: SummaryMetric;
    totalPurchases: SummaryMetric;
    totalProducts: SummaryMetric;
    totalCustomers: SummaryMetric;
  };
  recentTransactions?: Array<{
    id: number;
    number: string;
    totalAmount: number;
    status: string;
    paymentType: string;
    createdAt: string;
    cashier?: string | null;
  }>;
  kpis?: {
    totalSales?: SummaryMetric;
    transactions?: SummaryMetric;
    totalExpenses?: SummaryMetric;
    totalAlerts?: SummaryMetric;
  };
  stockAlerts: {
    lowStock: { count: number };
    expired: { count: number };
    outOfStock: { count: number };
  };
}

export interface DashboardNotification {
  type: string;
  title: string;
  message: string;
  time: string;
}

function orgId(): number {
  const id = useAuthStore.getState().activeOrganizationId;
  if (!id) throw new Error('No active organization');
  return id;
}

export async function getDashboardOverview(preset: DashboardPreset, branchId?: number | null): Promise<DashboardOverview> {
  const { data } = await apiClient.get(`/dashboard/overview/${orgId()}`, {
    params: { preset, branchId: branchId ?? undefined },
  });
  return data?.data ?? data;
}

export async function getDashboardNotifications(branchId?: number | null): Promise<DashboardNotification[]> {
  const { data } = await apiClient.get(`/dashboard/notifications/${orgId()}`, {
    params: { branchId: branchId ?? undefined },
  });
  return data?.data ?? data;
}
