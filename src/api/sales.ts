import { apiClient } from './client';
import { useAuthStore } from '../store/authStore';
import type { Product } from './products';

export interface SaleItem {
  id: number;
  productId?: number | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount?: number;
  taxAmount?: number;
  taxRate?: number;
  itemType?: 'PRODUCT' | 'SERVICE';
  serviceName?: string | null;
  product?: Product | null;
}

export interface SaleCustomer {
  id: number;
  name: string;
  phone?: string | null;
  TIN?: string | null;
  email?: string | null;
  address?: string | null;
  customerType?: string;
}

export interface SalePayment {
  id: number;
  amount: number;
  paymentMethod: SplitPayment['paymentMethod'];
  reference?: string | null;
  status: string;
  processedAt: string;
  metadata?: {
    phone?: string;
    provider?: MobileMoneyProvider;
    rail?: MobileMoneyRail;
    customerReference?: string;
    [key: string]: unknown;
  } | null;
}

export type SaleStatus = 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export interface Sale {
  id: number;
  saleNumber: string;
  invoiceNumber?: string | null;
  totalAmount: number;
  cashAmount: number;
  debtAmount: number;
  insuranceAmount: number;
  vatAmount?: number;
  taxableAmount?: number;
  paymentType: string;
  status: SaleStatus;
  createdAt: string;
  shiftId?: number | null;
  customer?: SaleCustomer | null;
  user?: { id: number; name: string; role?: string } | null;
  saleItems?: SaleItem[];
  salePayments?: SalePayment[];
  reprintCount?: number;
  rcptLabel?: string | null;
  originalSaleId?: number | null;
  originalSale?: {
    id: number;
    saleNumber: string;
    invoiceNumber?: string | null;
    createdAt: string;
  } | null;
}

export interface SplitPayment {
  paymentMethod: 'CASH' | 'BANK' | 'CARD' | 'PAYPACK' | 'MTN_MOMO' | 'AIRTEL_MONEY' | 'WALLET' | 'GIFT_CARD' | 'STORE_CREDIT';
  amount: number;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSaleInput {
  customerId: number;
  items: Array<{ productId: number; quantity: number; unitPrice: number; itemType?: 'PRODUCT' | 'SERVICE' }>;
  paymentType: 'CASH' | 'DEBT' | 'INSURANCE' | 'MIXED' | 'MOBILE_MONEY' | 'CREDIT_CARD';
  cashAmount: number;
  debtAmount: number;
  insuranceAmount: number;
  shiftId?: number;
  branchId?: number | null;
  notes?: string;
  payments?: SplitPayment[];
}

export type MobileMoneyProvider = 'MTN_MOMO' | 'AIRTEL_MONEY';
export type MobileMoneyRail = 'PAYPACK' | 'MTN_MOMO';
export type MobileMoneyStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface MobileMoneyTransaction {
  transactionId: string;
  reference: string;
  provider: MobileMoneyProvider;
  rail: MobileMoneyRail;
  status: MobileMoneyStatus;
  message?: string;
}

interface Paginated<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function orgId(): number {
  const id = useAuthStore.getState().activeOrganizationId;
  if (!id) throw new Error('No active organization');
  return id;
}

export async function createSale(input: CreateSaleInput): Promise<Sale> {
  const { data } = await apiClient.post(`/sales/${orgId()}`, input);
  return data?.data ?? data;
}

export async function initiateMobileMoneyPayment(input: {
  amount: number;
  provider: MobileMoneyProvider;
  phone: string;
  reference?: string;
  branchId?: number | null;
}): Promise<MobileMoneyTransaction> {
  const { data } = await apiClient.post(`/sales/${orgId()}/mobile-money/initiate`, input);
  return data?.data ?? data;
}

export async function getMobileMoneyPaymentStatus(
  transactionId: string,
  rail: MobileMoneyRail
): Promise<{ transactionId: string; status: MobileMoneyStatus; message?: string }> {
  const { data } = await apiClient.get(
    `/sales/${orgId()}/mobile-money/${encodeURIComponent(transactionId)}/status`,
    { params: { rail } }
  );
  return data?.data ?? data;
}

export async function cancelMobileMoneyPayment(
  transactionId: string,
  rail: MobileMoneyRail
): Promise<{ transactionId: string; status: MobileMoneyStatus; message?: string }> {
  const { data } = await apiClient.post(
    `/sales/${orgId()}/mobile-money/${encodeURIComponent(transactionId)}/cancel`,
    { rail }
  );
  return data?.data ?? data;
}

export async function getSales(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  branchId?: number | null;
}): Promise<Paginated<Sale>> {
  const { data } = await apiClient.get(`/sales/${orgId()}`, {
    params: {
      page: params.page || 1,
      limit: params.limit || 30,
      search: params.search || undefined,
      status: params.status || undefined,
      startDate: params.startDate || undefined,
      endDate: params.endDate || undefined,
      branchId: params.branchId ?? undefined,
    },
  });
  return data?.data ?? data;
}

export async function getSaleById(id: number): Promise<Sale> {
  const { data } = await apiClient.get(`/sales/${orgId()}/${id}`);
  return data?.data ?? data;
}

export async function cancelSale(id: number, reason: string): Promise<{ message: string }> {
  const { data } = await apiClient.post(`/sales/${orgId()}/${id}/cancel`, { reason });
  return data?.data ?? data;
}

export async function reprintSaleReceipt(id: number): Promise<Sale> {
  const { data } = await apiClient.post(`/sales/${orgId()}/${id}/reprint`);
  return data?.data ?? data;
}

export async function payDebt(id: number, amount: number): Promise<{ message: string }> {
  const { data } = await apiClient.put(`/sales/${id}/pay-debt/${orgId()}`, { amount });
  return data?.data ?? data;
}

export interface RefundResult {
  success: boolean;
  message: string;
  refundAmount: number;
  refundSale: Sale;
  refundedItems: Array<{ productId: number | null; quantity: number; unitPrice: number; totalPrice: number }>;
}

export async function refundSale(id: number, reason: string): Promise<RefundResult> {
  const { data } = await apiClient.post(`/sales/${id}/refund/${orgId()}`, { reason });
  return data?.data ?? data;
}

export interface EbmReceiptData {
  sdcId?: string | null;
  mrcNo?: string | null;
  sdcRcptNo?: number | null;
  internalData?: string | null;
  receiptSignature?: string | null;
  qrPayload?: string | null;
  sdcDateTime?: string | null;
  rcptLabel?: string | null;
  ebmInvoiceNumber?: string | null;
}

export interface InvoiceCompany {
  name: string;
  currency?: string | null;
}

export interface InvoiceCustomer {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface InvoiceDetails {
  id: string;
  saleNumber: string;
  invoiceNumber: string;
  receiptNumber: string;
  invoiceDate: string;
  status: string;
  currency: string;
}

export interface InvoiceTotals {
  paid: number;
  balance: number;
  grandTotal: number;
}

export interface CanonicalInvoice {
  company: InvoiceCompany;
  customer: InvoiceCustomer;
  invoice: InvoiceDetails;
  totals: InvoiceTotals;
  certification: {
    isCertified: boolean;
    certificateText?: string | null;
  };
  renderedHtml?: string | null;
}

/**
 * Fetch the same fully composed invoice document used by the web app. Mobile
 * printing and sharing must use `renderedHtml` instead of rebuilding a receipt.
 */
export async function getInvoice(saleId: number): Promise<CanonicalInvoice> {
  const { data } = await apiClient.get(`/sales/${orgId()}/invoices/${saleId}`);
  return data?.data ?? data;
}

export async function getEbmReceipt(saleId: number): Promise<{ status: 'success' | 'pending'; ebm?: EbmReceiptData }> {
  try {
    const { data } = await apiClient.get(`/sales/${orgId()}/${saleId}/ebm-receipt`);
    return data;
  } catch (error: any) {
    if (error?.response?.status === 202) return error.response.data;
    throw error;
  }
}
