import { useEffect, useState } from 'react';

export function useFirstVisit(key: string) {
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const visitedBefore = localStorage.getItem(key);
    if (!visitedBefore) {
      setIsFirstVisit(true);
      localStorage.setItem(key, 'true');
    }
  }, [key]);

  return isFirstVisit;
}