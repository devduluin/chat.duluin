import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AnswerState {
  answers: Record<string, any>;
  setAnswer: (questionId: string, value: any) => void;
  resetAnswers: () => void;
}

// Create a map to cache stores by formId
const answerStores = new Map<string, () => AnswerState>();

export const useAnswerStore = (formId: string) => {
  // Create new store if it doesn't exist for this formId
  if (!answerStores.has(formId)) {
    const newStore = create<AnswerState>()(
      persist(
        (set) => ({
          answers: {},
          setAnswer: (questionId, value) =>
            set((state) => ({
              answers: {
                ...state.answers,
                [questionId]: value,
              },
            })),
          resetAnswers: () => set({ answers: {} }),
        }),
        {
          name: `answers-storage-${formId}`, // Unique key per form
        }
      )
    );
    answerStores.set(formId, newStore);
  }

  // Return the store instance
  const useStore = answerStores.get(formId)!;
  return useStore();
};
