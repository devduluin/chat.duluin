import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EmailState {
  email: string | null;
  isEmailAllowed: boolean;
  setEmail: (email: string) => void;
  setIsEmailAllowed: (allowed: boolean) => void;
  clearEmail: () => void;
}

export const useEmailStore = create<EmailState>()(
  persist(
    (set) => ({
      email: null,
      isEmailAllowed: false,
      setEmail: (email) => set({ email }),
      setIsEmailAllowed: (allowed) => set({ isEmailAllowed: allowed }),
      clearEmail: () => set({ email: null, isEmailAllowed: false }),
    }),
    {
      name: 'allowed-email-storage', // Key in localStorage
    }
  )
);
