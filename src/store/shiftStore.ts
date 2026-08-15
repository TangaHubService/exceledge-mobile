import { create } from 'zustand';
import type { Shift } from '../api/shifts';

interface ShiftState {
  activeShift: Shift | null;
  setActiveShift: (shift: Shift | null) => void;
}

export const useShiftStore = create<ShiftState>((set) => ({
  activeShift: null,
  setActiveShift: (activeShift) => set({ activeShift }),
}));