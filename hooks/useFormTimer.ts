import { useEffect, useRef, useState } from "react";

export function useFormTimer({
  timeoutMinutes,
  onExpire,
  expiresAt,
  setExpiresAt,
  clearTimer,
}: {
  timeoutMinutes: number;
  onExpire: () => void;
  expiresAt: number | null;
  setExpiresAt: (timestamp: number) => void;
  clearTimer: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ⛔️ REMOVE auto-start: Let parent control when to call setExpiresAt()

  // Timer countdown logic (runs only when expiresAt is set and valid)
  useEffect(() => {
    if (!expiresAt) return;

    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      clearTimer();
      onExpire();
      return;
    }

    const tick = () => {
      const newRemaining = Math.floor((expiresAt - Date.now()) / 1000);
      if (newRemaining <= 0) {
        clearInterval(timerRef.current!);
        setTimeLeft(0);
        clearTimer();
        onExpire();
      } else {
        setTimeLeft(newRemaining);
      }
    };

    tick(); // Run once immediately
    timerRef.current = setInterval(tick, 1000);

    return () => clearInterval(timerRef.current!);
  }, [expiresAt, onExpire]);

  return {
    timeLeft,
    formatTime: () => {
      const mins = Math.floor(timeLeft / 60).toString().padStart(2, "0");
      const secs = (timeLeft % 60).toString().padStart(2, "0");
      return `${mins}:${secs}`;
    },
  };
}
