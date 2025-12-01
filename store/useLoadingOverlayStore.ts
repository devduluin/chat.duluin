import { create } from 'zustand';

interface LoadingState {
  loadingOverlay: boolean;
  setLoadingOverlay: (newLoading: boolean, delay?: number) => void;
  clearLoadingOverlay: () => void;
}

export const useLoadingOverlayStore = create<LoadingState>((set) => ({
  loadingOverlay: false,
  setLoadingOverlay: (newLoading, delay = 400) => {
    if (newLoading) {
      // Immediate set when turning loading on
      set({ loadingOverlay: true });
    } else {
      // Only use timeout when turning loading off
      const timer = setTimeout(() => {
        set({ loadingOverlay: false });
      }, delay);
      
      // Return cleanup function
      return () => clearTimeout(timer);
    }
  },
  clearLoadingOverlay: () => set({ loadingOverlay: false }),
}));