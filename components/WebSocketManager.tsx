// components/WebSocketManager.tsx
"use client";

import { useEffect, useState } from "react";
import { useGlobalMessageSocket } from "@/hooks/useGlobalMessageSocket";
import { useAccountStore } from "@/store/useAccountStore";
import Cookies from "js-cookie";
import { usePathname } from "next/navigation";

/**
 * Global WebSocket Manager
 * Initializes and maintains a single WebSocket connection for all conversations
 */
export function WebSocketManager() {
  const { data: account } = useAccountStore();
  const pathname = usePathname();
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false);

  // Get userId from account store or fallback to cookies
  const userIdFromCookies =
    typeof window !== "undefined" ? Cookies.get("user_id") || "" : "";
  const userId = account?.id || userIdFromCookies;

  // Don't connect WebSocket on auth pages
  const isAuthPage = pathname?.startsWith("/auth/");

  // Initialize global WebSocket connection
  const { isConnected, sendMessage } = useGlobalMessageSocket(
    isAuthPage ? "" : userId,
  );

  useEffect(() => {
    if (!isAuthPage && userId && !hasAttemptedConnection) {
      console.log("🌐 WebSocketManager Initializing:", {
        userId,
        isAuthPage,
        pathname,
      });
      setHasAttemptedConnection(true);
    }
  }, [userId, isAuthPage, pathname, hasAttemptedConnection]);

  useEffect(() => {
    if (!isAuthPage) {
      console.log("🌐 WebSocketManager Status:", {
        userId,
        isConnected,
        hasSendMessage: !!sendMessage,
        readyToSend: isConnected && !!sendMessage,
      });
    }
  }, [userId, isConnected, sendMessage, isAuthPage]);

  // This component doesn't render anything, it just manages the WebSocket
  return null;
}
