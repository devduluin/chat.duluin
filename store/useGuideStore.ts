// store/useGuideStore.ts
import { create } from "zustand";

export type GuideStep = {
  id: string;
  ref: React.RefObject<HTMLElement | null>;
  config: {
    title: string;
    description: string;
    icon?: React.ReactNode;
    position?: "top" | "bottom" | "left" | "right";
    onClose?: () => void;
  };
};

type GuideState = {
  steps: GuideStep[];
  currentIndex: number;
  isRunning: boolean;
  registerStep: (step: GuideStep) => void;
  startGuide: () => void;
  nextStep: () => void;
  resetGuide: () => void;
};

export const useGuideStore = create<GuideState>((set, get) => ({
  steps: [],
  currentIndex: 0,
  isRunning: false,

  registerStep: (step) =>
    set((state) => {
      const exists = state.steps.find((s) => s.id === step.id);
      if (exists) return state; // Prevent duplicates
      return { steps: [...state.steps, step] };
    }),

  startGuide: () => set({ isRunning: true, currentIndex: 0 }),

  nextStep: () => {
    const { currentIndex, steps } = get();
    const nextIndex = currentIndex + 1;
    console.log('nextIndex', nextIndex)
    if (nextIndex < steps.length) {
      set({ currentIndex: nextIndex });
    } else {
      set({ isRunning: false, currentIndex: 0 });
    }
  },

  resetGuide: () => set({ steps: [], currentIndex: 0, isRunning: false }),
}));
