import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ShowQuestionsState {
  showQuestions: boolean;
  isPrivate: boolean;
  setShowQuestions: (value: boolean) => void;
  toggleShowQuestions: () => void;
  setIsPrivate: (value: boolean) => void;
  toggleIsPrivate: () => void;
}

// Create a map to store our store instances
const stores = new Map<string, () => ShowQuestionsState>();

export const useShowQuestionsStore = (id: string) => {
  // If we don't have a store for this id yet, create one
  if (!stores.has(id)) {
    const newStore = create<ShowQuestionsState>()(
      persist(
        (set) => ({
          showQuestions: false,
          isPrivate: false,
          setShowQuestions: (value) => set({ showQuestions: value }),
          toggleShowQuestions: () =>
            set((state) => ({ showQuestions: !state.showQuestions })),
          setIsPrivate: (value) => set({ isPrivate: value }),
          toggleIsPrivate: () =>
            set((state) => ({ isPrivate: !state.isPrivate })),
        }),
        {
          name: `show-questions-storage-${id}`,
        }
      )
    );
    stores.set(id, newStore);
  }

  // Get the store hook for this id and call it
  const useStore = stores.get(id)!;
  return useStore();
};