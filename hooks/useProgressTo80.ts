'use client';

import { useEffect, useRef, useState } from 'react';

export function useProgressTo80(shouldAnimate: boolean) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!shouldAnimate) return;

    setProgress(10);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev < 80) {
          return prev + 2;
        } else {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shouldAnimate]);

  return [progress, setProgress] as const;
}
