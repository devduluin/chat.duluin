// hooks/useNetworkStatus.ts
import { useEffect } from "react";
import { useOfflineQueueStore } from "@/store/useOfflineQueueStore";

export const useNetworkStatus = () => {
  const isOnline = useOfflineQueueStore((state) => state.isOnline);
  const setOnlineStatus = useOfflineQueueStore(
    (state) => state.setOnlineStatus
  );

  useEffect(() => {
    // Set initial status only if different
    const currentStatus = navigator.onLine;
    if (currentStatus !== isOnline) {
      setOnlineStatus(currentStatus);
    }

    // Listen for online/offline events
    const handleOnline = () => {
      console.log("🟢 Network connection restored");
      setOnlineStatus(true);
    };

    const handleOffline = () => {
      console.log("🔴 Network connection lost");
      setOnlineStatus(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []); // Empty deps - only run once on mount

  return { isOnline };
};
