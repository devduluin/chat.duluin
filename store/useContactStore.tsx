// store/useContactsStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ContactsStore {
  contacts: any[];
  isSyncing: boolean;
  setContacts: (contacts: any[]) => void;
  setIsSyncing: (isSyncing: boolean) => void;
  updateContactStatus: (targetUserId: string, status: string, lastSeenAt: string) => void;
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
      updateContactStatus: (targetUserId, status, lastSeenAt) =>
        set((state) => ({
          contacts: state.contacts.map((item) => {
            const currentTargetId = item.target?.id || (item as any).target_id || (item as any).TargetID;
            if (currentTargetId === targetUserId) {
              return {
                ...item,
                target: {
                  ...item.target,
                  status,
                  last_seen_at: lastSeenAt,
                  is_online: status === "online",
                }
              };
            }
            return item;
          })
        })),
      clearContacts: () => set({ contacts: [], isSyncing: false }),
    }),
    {
      name: 'contacts-storage', // localStorage key
    }
  )
);
