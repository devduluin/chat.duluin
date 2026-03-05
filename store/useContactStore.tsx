// store/useContactsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ContactsStore {
  contacts: ContactData[];
  isSyncing: boolean;
  setContacts: (contacts: ContactData[]) => void;
  setIsSyncing: (isSyncing: boolean) => void;
  clearContacts: () => void;
}

// Zustand Store
export const useContactsStore = create<ContactsStore>()(
  persist(
    (set) => ({
      contacts: [],
      isSyncing: false,
      setContacts: (contacts) => set({ contacts }),
      setIsSyncing: (isSyncing) => set({ isSyncing }),
      clearContacts: () => set({ contacts: [], isSyncing: false }),
    }),
    {
      name: 'contacts-storage', // localStorage key
    }
  )
);
