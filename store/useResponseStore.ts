import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DataState {
  dataResponse: any;
  setDataResponse: (newData: any) => void;
  clearDataResponse: () => void;
}

export const useResponseStore = create<DataState>()(
  persist(
    (set) => ({
      dataResponse: null,
      setDataResponse: (newData) => set({ dataResponse: newData }),
      clearDataResponse: () => set({ dataResponse: null }),
    }),
    {
      name: 'response-store', // key in localStorage
    }
  )
);