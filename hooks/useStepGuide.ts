import { useCallback, useRef, useState } from "react";

type GuideStep = {
  ref: React.RefObject<HTMLElement | null>;
  config: {
    title: string;
    description: string;
    icon?: React.ReactNode;
    position?: 'right' | 'left' | 'top' | 'bottom';
    onClose?: () => void;
  };
};

export function useStepGuide(showGuideFn: (el: HTMLElement, config: any) => void) {
  const steps = useRef<GuideStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const addStep = useCallback((step: GuideStep) => {
    steps.current.push(step);
  }, []);

  const startGuide = useCallback(() => {
    setIsActive(true);
    setCurrentStepIndex(0);
  }, []);

  const nextStep = useCallback(() => {
    const current = steps.current[currentStepIndex];
    current?.config.onClose?.();

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.current.length) {
      setCurrentStepIndex(nextIndex);
    } else {
      setIsActive(false);
    }
  }, [currentStepIndex]);

  const resetGuide = useCallback(() => {
    steps.current = [];
    setCurrentStepIndex(0);
    setIsActive(false);
  }, []);

  // Show the current guide step
  const run = useCallback(() => {
    if (!isActive || !steps.current[currentStepIndex]) return;
    const step = steps.current[currentStepIndex];
    const el = step.ref.current;

    if (el) {
      showGuideFn(el, {
        ...step.config,
        onClose: nextStep,
      });
    }
  }, [isActive, currentStepIndex, nextStep, showGuideFn]);

  return {
    addStep,
    startGuide,
    resetGuide,
    currentStepIndex,
    run,
    isActive,
  };
}
