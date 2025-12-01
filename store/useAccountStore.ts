import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AccountState {
  data: any;
  setData: (newData: any) => void;
  clearData: () => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      data: '',
      setData: (newData) => set({ data: newData }),
      clearData: () => set({ data: '' }),
    }),
    {
      name: 'account-store', // key in localStorage
    }
  )
);
