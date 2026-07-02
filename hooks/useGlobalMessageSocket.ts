// hooks/useGlobalMessageSocket.ts
import { useEffect, useRef, useCallback, useMemo } from "react";
import { useChatStore } from "@/store/useChatStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { useContactsStore } from "@/store/useContactStore";
import { toast } from "sonner";
import { connectGlobalWebSocket } from "@/lib/ws/connection";
import { dispatchWsMessage } from "@/lib/ws/dispatch";
import {
  createNotificationTrigger,
  playIncomingCallSound,
} from "@/lib/ws/notifications";
import { parseWsMessageData, parseWsResponse } from "@/lib/ws/parse";
import type { WsHandlerContext } from "@/lib/ws/types";

/**
 * Global WebSocket hook - SINGLE WebSocket for ALL conversations.
 * Connection lifecycle stays here; message routing lives in lib/ws/.
 */
export function useGlobalMessageSocket(userId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const reconnectInterval = 5000;
  const isMounted = useRef(false);
  const shouldReconnect = useRef(true);
  const fetchingConversations = useRef<Set<string>>(new Set());
  const processedMessageIds = useRef<Record<string, number>>({});
  const ringState = useRef(false);

  const addOrUpdateMessage = useChatStore((s) => s.addOrUpdateMessage);
  const setLastMessage = useConversationsStore((s) => s.setMessage);
  const addNewConversation = useConversationsStore((s) => s.addNewConversation);
  const { setSendMessage, setConnected } = useWebSocketStore();
  const setIsSyncing = useContactsStore((s) => s.setIsSyncing);

  const triggerNotification = useMemo(
    () => createNotificationTrigger(userId, ringState),
    [userId],
  );

  const wsContext = useMemo<WsHandlerContext>(
    () => ({
      userId,
      ringState,
      processedMessageIds,
      fetchingConversations,
      setIsSyncing,
      playIncomingCallSound: () => playIncomingCallSound(ringState),
      triggerNotification,
      addOrUpdateMessage,
      setLastMessage,
      addNewConversation,
    }),
    [
      userId,
      triggerNotification,
      addOrUpdateMessage,
      setLastMessage,
      addNewConversation,
      setIsSyncing,
    ],
  );

  const wsContextRef = useRef(wsContext);
  wsContextRef.current = wsContext;

  const sendMessageStable = useCallback((payload: string | object) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn(
        "⚠️ WebSocket not connected. State:",
        wsRef.current?.readyState,
      );
      toast.error("Connection lost. Please wait...", {
        id: "ws-disconnected",
      });
      return false;
    }

    try {
      const messageToSend =
        typeof payload === "string" ? payload : JSON.stringify(payload);
      console.log("📤 Sending message via WebSocket:", messageToSend);
      wsRef.current.send(messageToSend);
      return true;
    } catch (error) {
      console.error("❌ Send error:", error);
      toast.error("Failed to send message", { id: "send-error" });
      return false;
    }
  }, []);

  useEffect(() => {
    setSendMessage(sendMessageStable);
    return () => {
      setSendMessage(null);
    };
  }, [sendMessageStable, setSendMessage]);

  const connectWebSocket = useCallback(() => {
    console.log("🔍 connectWebSocket called:", {
      userId,
      hasUserId: !!userId && userId.trim() !== "",
      isMounted: isMounted.current,
      shouldReconnect: shouldReconnect.current,
      currentWsState: wsRef.current?.readyState,
    });

    connectGlobalWebSocket({
      userId,
      isMounted,
      shouldReconnect,
      reconnectAttempts,
      maxReconnectAttempts,
      reconnectInterval,
      wsRef,
      onOpen: () => setConnected(true),
      onReconnect: connectWebSocket,
      onMessage: async (event) => {
        try {
          console.log("🌍📨 [RAW] WebSocket data:", event.data);
          console.log(
            "🌍📨 [TYPE] Data type:",
            typeof event.data,
            event.data instanceof Blob ? "(Blob)" : "",
          );

          const jsonData = await parseWsMessageData(event.data);
          const response = parseWsResponse(jsonData);
          await dispatchWsMessage(response, wsContextRef.current);
        } catch (err) {
          console.error("Failed to parse global WebSocket message:", err);
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId || userId.trim() === "") {
      console.log("⏸️ Skipping WebSocket - no userId");
      return;
    }

    console.log("🔄 Global WebSocket Effect Triggered for:", userId);
    shouldReconnect.current = true;
    isMounted.current = true;

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((perm) => {
          console.log("🔔 Floating notification permission status:", perm);
        });
      }
    }

    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      connectWebSocket();
    }

    return () => {
      console.log("🧹 Cleanup Global WebSocket Effect");
      isMounted.current = false;
      shouldReconnect.current = false;
      if (wsRef.current) {
        console.log("🔌 Closing global WebSocket connection due to unmount/change");
        wsRef.current.close(1000, "Component unmounted");
        wsRef.current = null;
        setConnected(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    sendMessage: sendMessageStable,
  };
}
