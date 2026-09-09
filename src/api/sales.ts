import { apiClient } from './client';
import { useAuthStore } from '../store/authStore';
import { File, Paths } from 'expo-file-system';
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
    rail?: 'PAYPACK' | 'MTN_MOMO';
    customerReference?: string;
    [key: string]: unknown;
  } | null;
}

export type SaleStatus = 'COMPLETED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CONVERTED';

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
  isProforma?: boolean;
  proformaSourceId?: number | null;
  convertedSale?: { id: number; invoiceNumber?: string | null; saleNumber?: string | null } | null;
  proformaSource?: { id: number; invoiceNumber?: string | null } | null;
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

export interface ConvertProformaInput {
  items?: Array<{ productId?: number; quantity: number; unitPrice: number; itemType?: 'PRODUCT' | 'SERVICE'; serviceName?: string }>;
  paymentType: CreateSaleInput['paymentType'];
  cashAmount: number;
  debtAmount: number;
  insuranceAmount: number;
  shiftId?: number;
  payments?: SplitPayment[];
  customerId?: number;
}

/** Convert a proforma into a real, fiscalized NS sale. */
export async function convertProforma(id: number, input: ConvertProformaInput): Promise<Sale> {
  const { data } = await apiClient.post(`/sales/${orgId()}/${id}/convert`, input);
  return data?.data ?? data;
}

/** Replace a proforma's line items before it is converted. */
export async function updateProforma(
  id: number,
  input: { customerId?: number; items: Array<{ productId?: number; quantity: number; unitPrice: number; itemType?: 'PRODUCT' | 'SERVICE'; serviceName?: string }> },
): Promise<Sale> {
  const { data } = await apiClient.put(`/sales/${orgId()}/${id}/proforma`, input);
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
  /** Set when the sale is a real NS/NR sale VSDC has not confirmed yet — the
   * document is composed anyway and stamped NOT FISCALISED. */
  notFiscalized?: 'pending' | 'failed' | null;
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

/** Fetch invoice metadata/status; print and share use getInvoicePdfFile().
 * Passes allowPending=1 so a real sale VSDC has not confirmed (still syncing, or
 * failed) returns the composed document stamped NOT FISCALISED instead of 425 —
 * otherwise the print/share screen can never load and the PDF stays unreachable. */
export async function getInvoice(saleId: number): Promise<CanonicalInvoice> {
  const { data } = await apiClient.get(`/sales/${orgId()}/invoices/${saleId}?allowPending=1`);
  return data?.data ?? data;
}

/** Download the authoritative backend-generated PDF into the Expo cache. */
export async function getInvoicePdfFile(saleId: number, invoiceNumber: string): Promise<File> {
  const response = await apiClient.get<ArrayBuffer>(`/sales/${orgId()}/invoices/${saleId}/pdf`, {
    responseType: 'arraybuffer',
    headers: { Accept: 'application/pdf' },
  });
  const bytes = new Uint8Array(response.data);
  if (bytes.length < 1_000) throw new Error('The server returned an invalid invoice PDF.');

  const safeNumber = String(invoiceNumber || saleId).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || String(saleId);
  const file = new File(Paths.cache, `EBM-Invoice-${safeNumber}.pdf`);
  file.create({ overwrite: true, intermediates: true });
  file.write(bytes);
  return file;
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
