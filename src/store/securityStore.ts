import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from './secureStorage';

const SECURITY_PREFS_KEY = 'excel_edge_security_prefs';
const PIN_KEY = 'excel_edge_pin';

export interface SecurityPrefs {
  pinEnabled: boolean;
  autoLockMinutes: number;
}

export const DEFAULT_SECURITY_PREFS: SecurityPrefs = {
  pinEnabled: false,
  autoLockMinutes: 0,
};

export const AUTO_LOCK_OPTIONS = [0, 1, 5, 15, 60];

interface SecurityState extends SecurityPrefs {
  isHydrated: boolean;
  hasPin: boolean;
  locked: boolean;
  hydrate: () => Promise<void>;
  setPin: (pin: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<boolean>;
  clearPin: () => Promise<void>;
  setPinEnabled: (value: boolean) => Promise<void>;
  setAutoLockMinutes: (value: number) => Promise<void>;
  lock: () => void;
  unlock: () => void;
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  pinEnabled: DEFAULT_SECURITY_PREFS.pinEnabled,
  autoLockMinutes: DEFAULT_SECURITY_PREFS.autoLockMinutes,
  isHydrated: false,
  hasPin: false,
  locked: false,

  hydrate: async () => {
    try {
      const [prefsRaw, pin] = await Promise.all([
        AsyncStorage.getItem(SECURITY_PREFS_KEY),
        secureStorage.getItem(PIN_KEY),
      ]);
      const prefs = prefsRaw ? (JSON.parse(prefsRaw) as Partial<SecurityPrefs>) : {};
      set({
        pinEnabled: prefs.pinEnabled ?? DEFAULT_SECURITY_PREFS.pinEnabled,
        autoLockMinutes: prefs.autoLockMinutes ?? DEFAULT_SECURITY_PREFS.autoLockMinutes,
        hasPin: !!pin,
        locked: !!pin && (prefs.pinEnabled ?? false),
        isHydrated: true,
      });
    } catch {
      set({ isHydrated: true });
    }
  },

  setPin: async (pin) => {
    await secureStorage.setItem(PIN_KEY, `pin:${pin}`);
    set({ hasPin: true });
  },

  verifyPin: async (pin) => {
    const stored = await secureStorage.getItem(PIN_KEY);
    return stored === `pin:${pin}`;
  },

  clearPin: async () => {
    await secureStorage.removeItem(PIN_KEY);
    set({ hasPin: false, pinEnabled: false, locked: false });
  },

  setPinEnabled: async (value) => {
    set({ pinEnabled: value, locked: value ? get().locked : false });
    const { autoLockMinutes } = get();
    await AsyncStorage.setItem(SECURITY_PREFS_KEY, JSON.stringify({ pinEnabled: value, autoLockMinutes }));
  },

  setAutoLockMinutes: async (value) => {
    set({ autoLockMinutes: value });
    const { pinEnabled } = get();
    await AsyncStorage.setItem(SECURITY_PREFS_KEY, JSON.stringify({ pinEnabled, autoLockMinutes: value }));
  },

  lock: () => set({ locked: get().hasPin && get().pinEnabled }),

  unlock: () => set({ locked: false }),
}));