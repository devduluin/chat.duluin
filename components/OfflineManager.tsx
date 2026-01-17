// components/OfflineManager.tsx
"use client";

import { useEffect, useRef } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export function OfflineManager() {
  // Initialize network status monitoring
  useNetworkStatus();

  // Initialize offline sync
  const { pendingCount, failedCount, isSyncing } = useOfflineSync();

  // Use ref to prevent excessive logging
  const loggedRef = useRef(false);

  useEffect(() => {
    if ((pendingCount > 0 || failedCount > 0) && !loggedRef.current) {
      console.log(`📊 Offline Queue Status:`, {
        pending: pendingCount,
        failed: failedCount,
        syncing: isSyncing,
      });
      loggedRef.current = true;
    } else if (pendingCount === 0 && failedCount === 0) {
      loggedRef.current = false;
    }
  }, [pendingCount, failedCount, isSyncing]);

  // This component doesn't render anything, it just runs the hooks
  return null;
}
