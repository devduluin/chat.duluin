// store/useContactsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ContactsStore {
  contacts: ContactData[];
  setContacts: (contacts: ContactData[]) => void;
  clearContacts: () => void;
}

// Zustand Store
export const useContactsStore = create<ContactsStore>()(
  persist(
    (set) => ({
      contacts: [],
      setContacts: (contacts) => set({ contacts }),
      clearContacts: () => set({ contacts: [] }),
    }),
    {
      name: 'contacts-storage', // localStorage key
    }
  )
);
