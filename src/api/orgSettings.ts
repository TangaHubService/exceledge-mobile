import { apiClient } from './client';
import { useAuthStore } from '../store/authStore';

export interface IFeatureFlags {
  allowNegativeStock: boolean;
  ebmIntegrationEnabled: boolean;
  requireStockAdjustmentApproval: boolean;
  allowManualDiscounts: boolean;
  stockTransfersEnabled: boolean;
}

export interface IPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  defaultLandingPage: string;
  lowStockThresholdOverride: number | null;
  enabledPaymentMethods: string[];
}

export interface IOrganizationSettings {
  sidebarConfig: Record<string, boolean>;
  featureFlags: IFeatureFlags;
  preferences: IPreferences;
}

export const DEFAULT_ENABLED_PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'CARD', 'BANK_TRANSFER', 'DEBT'];

export const DEFAULT_SETTINGS: IOrganizationSettings = {
  sidebarConfig: {},
  featureFlags: {
    allowNegativeStock: false,
    ebmIntegrationEnabled: true,
    requireStockAdjustmentApproval: false,
    allowManualDiscounts: true,
    stockTransfersEnabled: true,
  },
  preferences: {
    language: 'en',
    timezone: 'Africa/Kigali',
    dateFormat: 'DD/MM/YYYY',
    defaultLandingPage: 'dashboard',
    lowStockThresholdOverride: null,
    enabledPaymentMethods: DEFAULT_ENABLED_PAYMENT_METHODS,
  },
};

function orgId(): number {
  const id = useAuthStore.getState().activeOrganizationId;
  if (!id) throw new Error('No active organization');
  return id;
}

export function normalizeSettings(raw: Partial<IOrganizationSettings> | undefined): IOrganizationSettings {
  return {
    sidebarConfig: { ...(raw?.sidebarConfig ?? {}) },
    featureFlags: { ...DEFAULT_SETTINGS.featureFlags, ...(raw?.featureFlags ?? {}) },
    preferences: {
      ...DEFAULT_SETTINGS.preferences,
      ...(raw?.preferences ?? {}),
      enabledPaymentMethods: Array.isArray(raw?.preferences?.enabledPaymentMethods)
        ? raw!.preferences!.enabledPaymentMethods
        : DEFAULT_ENABLED_PAYMENT_METHODS,
    },
  };
}

export async function getOrgSettings(): Promise<IOrganizationSettings> {
  const { data } = await apiClient.get(`/organizations/${orgId()}/settings`);
  return normalizeSettings(data?.settings ?? data?.data ?? data);
}

export async function updateOrgSettings(
  patch: Partial<{ featureFlags: Partial<IFeatureFlags>; preferences: Partial<IPreferences> }>
): Promise<IOrganizationSettings> {
  const { data } = await apiClient.patch(`/organizations/${orgId()}/settings`, patch);
  return normalizeSettings(data?.settings ?? data?.data ?? data);
}