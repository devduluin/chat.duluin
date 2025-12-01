import { create } from 'zustand';

interface LoadingState {
  loading: boolean;
  setLoading: (newLoading: boolean, delay?: number) => void;
  clearLoading: () => void;
}

export const useLoadingStore = create<LoadingState>((set) => ({
  loading: false,
  setLoading: (newLoading, delay = 400) => {
    if (newLoading) {
      // Immediate set when turning loading on
      set({ loading: true });
    } else {
      // Only use timeout when turning loading off
      const timer = setTimeout(() => {
        set({ loading: false });
      }, delay);
      
      // Return cleanup function
      return () => clearTimeout(timer);
    }
  },
  clearLoading: () => set({ loading: false }),
}));