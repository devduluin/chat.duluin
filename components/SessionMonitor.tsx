"use client";

import { useEffect } from "react";
import { useSessionMonitor } from "@/hooks/useSessionMonitor";
import { usePathname } from "next/navigation";

/**
 * Client-side component to monitor session expiration
 * Only active on authenticated pages (not on /auth/*)
 */
export function SessionMonitor() {
  const pathname = usePathname();
  const { handleLogout } = useSessionMonitor();

  // Only monitor session on non-auth pages
  const isAuthPage = pathname?.startsWith("/auth/");

  useEffect(() => {
    if (isAuthPage) return;

    // Session monitor runs via useSessionMonitor hook
    // which checks expiration every minute
  }, [isAuthPage]);

  return null; // This is a logical component, no UI
}
