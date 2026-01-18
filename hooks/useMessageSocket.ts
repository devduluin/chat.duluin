// hooks/useMessageSocket.ts
import { useEffect, useCallback } from "react";
import { useWebSocketStore } from "@/store/useWebSocketStore";

/**
 * Hook for conversation-specific messaging
 * Uses the global WebSocket connection (no duplicate connections)
 */
export function useMessageSocket(conversationId: string, userId: string) {
  const { sendMessage: globalSendMessage } = useWebSocketStore();

  // Wrapper to send message to specific conversation
  const sendMessage = useCallback(
    (payload: string | object) => {
      if (!globalSendMessage) {
        console.warn("⚠️ Global WebSocket not ready yet");
        return false;
      }

      // If payload is a string, wrap it in an object with conversation_id
      let messagePayload: any;

      if (typeof payload === "string") {
        messagePayload = {
          conversation_id: conversationId,
          content: payload,
        };
      } else {
        messagePayload = {
          ...payload,
          conversation_id: conversationId,
        };
      }

      console.log("📤 Sending via global WebSocket:", messagePayload);
      return globalSendMessage(JSON.stringify(messagePayload));
    },
    [conversationId, globalSendMessage]
  );

  return { sendMessage };
}
