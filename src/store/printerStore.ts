import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRINTER_PREFS_KEY = 'excel_edge_printer_prefs';

export interface PrinterPrefs {
  autoPrintAfterSale: boolean;
  copies: number;
}

export const DEFAULT_PRINTER_PREFS: PrinterPrefs = {
  autoPrintAfterSale: false,
  copies: 1,
};

interface PrinterState extends PrinterPrefs {
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setAutoPrintAfterSale: (value: boolean) => Promise<void>;
  setCopies: (value: number) => Promise<void>;
}

export const usePrinterStore = create<PrinterState>((set, get) => ({
  ...DEFAULT_PRINTER_PREFS,
  isHydrated: false,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(PRINTER_PREFS_KEY);
      const stored = raw ? (JSON.parse(raw) as Partial<PrinterPrefs>) : {};
      set({
        autoPrintAfterSale: stored.autoPrintAfterSale ?? DEFAULT_PRINTER_PREFS.autoPrintAfterSale,
        copies: Math.min(3, Math.max(1, Number(stored.copies) || 1)),
        isHydrated: true,
      });
    } catch {
      set({ isHydrated: true });
    }
  },

  setAutoPrintAfterSale: async (value) => {
    set({ autoPrintAfterSale: value });
    const { copies } = get();
    await AsyncStorage.setItem(PRINTER_PREFS_KEY, JSON.stringify({ autoPrintAfterSale: value, copies }));
  },

  setCopies: async (value) => {
    const copies = Math.min(3, Math.max(1, value));
    set({ copies });
    const { autoPrintAfterSale } = get();
    await AsyncStorage.setItem(PRINTER_PREFS_KEY, JSON.stringify({ autoPrintAfterSale, copies }));
  },
}));