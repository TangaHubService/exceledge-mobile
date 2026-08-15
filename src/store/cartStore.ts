import { create } from 'zustand';
import type { HeldSaleItem } from '../api/heldSales';
import type { Customer } from '../api/customers';

export interface CartItem {
  key: string;
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  itemType: 'PRODUCT' | 'SERVICE';
  stock?: number;
  imageUrl?: string | null;
}

type PaymentType = 'CASH' | 'DEBT' | 'INSURANCE' | 'MIXED' | 'MOBILE_MONEY' | 'CREDIT_CARD';

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  paymentType: PaymentType;
  cashAmount: number;
  notes: string;
  add: (item: Omit<CartItem, 'key' | 'quantity' | 'discount'>, allowNegativeStock?: boolean) => void;
  increment: (key: string, allowNegativeStock?: boolean) => void;
  decrement: (key: string) => void;
  setQuantity: (key: string, quantity: number, allowNegativeStock?: boolean) => void;
  remove: (key: string) => void;
  clear: () => void;
  setCustomer: (customer: Customer | null) => void;
  setPaymentType: (t: PaymentType) => void;
  setCashAmount: (n: number) => void;
  setNotes: (n: string) => void;
  restoreFromHeld: (items: HeldSaleItem[], customer: Customer | null) => void;
}

const makeKey = (productId: number) => `p-${productId}`;

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  paymentType: 'CASH',
  cashAmount: 0,
  notes: '',

  add: (item, allowNegativeStock = false) => {
    const key = makeKey(item.productId);
    set((s) => {
      const existing = s.items.find((i) => i.key === key);
      if (existing) {
        const nq = existing.quantity + 1;
        if (!allowNegativeStock && item.stock !== undefined && nq > item.stock) return s;
        return {
          ...s,
          items: s.items.map((i) => (i.key === key ? { ...i, quantity: nq } : i)),
        };
      }
      return {
        ...s,
        items: [...s.items, { ...item, key, quantity: 1, discount: 0 }],
      };
    });
  },

  increment: (key, allowNegativeStock = false) => {
    set((s) => ({
      ...s,
      items: s.items.map((i) => {
        if (i.key !== key) return i;
        const nq = i.quantity + 1;
        if (!allowNegativeStock && i.stock !== undefined && nq > i.stock) return i;
        return { ...i, quantity: nq };
      }),
    }));
  },

  decrement: (key) => {
    set((s) => ({
      ...s,
      items: s.items
        .map((i) => (i.key === key ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0),
    }));
  },

  setQuantity: (key, quantity, allowNegativeStock = false) => {
    if (quantity < 1) {
      get().remove(key);
      return;
    }
    set((s) => ({
      ...s,
      items: s.items.map((i) => {
        if (i.key !== key) return i;
        if (!allowNegativeStock && i.stock !== undefined && quantity > i.stock) return i;
        return { ...i, quantity };
      }),
    }));
  },

  remove: (key) => {
    set((s) => ({ ...s, items: s.items.filter((i) => i.key !== key) }));
  },

  clear: () => set({ items: [], customer: null, paymentType: 'CASH', cashAmount: 0, notes: '' }),

  setCustomer: (customer) => set({ customer }),
  setPaymentType: (paymentType) => set({ paymentType }),
  setCashAmount: (cashAmount) => set({ cashAmount }),
  setNotes: (notes) => set({ notes }),

  restoreFromHeld: (items, customer) => {
    const restored: CartItem[] = items.map((i) => ({
      key: i.productId ? makeKey(i.productId) : `svc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: i.productId ?? 0,
      name: i.name ?? (i.serviceName || 'Service'),
      unitPrice: Number(i.unitPrice),
      quantity: Number(i.quantity),
      discount: Number(i.discount ?? 0),
      itemType: i.itemType ?? (i.productId ? 'PRODUCT' : 'SERVICE'),
      stock: i.stock,
      imageUrl: i.imageUrl,
    }));
    set({ items: restored, customer });
  },
}));

export const selectCartSubtotal = (s: { items: CartItem[] }): number =>
  s.items.reduce((sum, i) => sum + i.unitPrice * i.quantity - i.discount, 0);

export const selectCartCount = (s: { items: CartItem[] }): number =>
  s.items.reduce((sum, i) => sum + i.quantity, 0);
