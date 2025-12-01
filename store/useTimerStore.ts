import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TimerState {
  expiresAt: number | null; // Use timestamp instead
  setExpiresAt: (timestamp: number) => void;
  clearTimer: () => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set) => ({
      expiresAt: null,
      setExpiresAt: (timestamp) => set({ expiresAt: timestamp }),
      clearTimer: () => set({ expiresAt: null }),
    }),
    {
      name: 'form-timer-storage',
    }
  )
);
