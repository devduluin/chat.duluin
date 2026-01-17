// hooks/useMessageSocket.ts
import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "@/store/useChatStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { toast } from "sonner";

export function useMessageSocket(conversationId: string, userId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const reconnectInterval = 5000;
  const isMounted = useRef(false);
  const shouldReconnect = useRef(true);

  const addOrUpdateMessage = useChatStore((s) => s.addOrUpdateMessage);
  const updateMessageStatus = useChatStore((s) => s.updateMessageStatus);
  const setLastMessage = useConversationsStore((s) => s.setMessage);

  const connectWebSocket = useCallback(() => {
    console.log("🔍 connectWebSocket called:", {
      userId,
      hasUserId: !!userId && userId.trim() !== "",
      isMounted: isMounted.current,
      shouldReconnect: shouldReconnect.current,
      currentWsState: wsRef.current?.readyState,
    });

    // ✅ Don't connect if no userId (not authenticated yet)
    if (!userId || userId.trim() === "") {
      console.log("⏸️ Skipping WebSocket connection: No userId");
      return;
    }

    // ✅ Prevent duplicate connection attempts
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      console.log("WebSocket already connected or connecting.");
      return;
    }

    if (!isMounted.current || !shouldReconnect.current) return;

    try {
      const ws = new WebSocket(`ws://localhost:3000/api/v1/chat/${userId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(
          "💬✅ Per-Conversation WebSocket CONNECTED for conversationId:",
          conversationId
        );
        console.log("💬 WebSocket readyState:", ws.readyState, "(1=OPEN)");
        reconnectAttempts.current = 0;

        const messages = useChatStore.getState().messages[conversationId] || [];
        const pendingMessages = messages.filter((m) => m.status === "pending");

        pendingMessages.forEach((msg) => {
          if (msg.content && typeof msg.content === "string") {
            ws.send(JSON.stringify({ content: msg.content }));
            updateMessageStatus(msg.id, conversationId, "sent");
          }
        });
      };

      ws.onmessage = (event) => {
        try {
          console.log("💬📨 Per-Conversation WebSocket RAW data:", event.data);
          const response = JSON.parse(event.data);
          console.log("💬📨 Parsed response:", response);

          console.log("📨 WebSocket message received:", {
            conversationId,
            messageId: response.data?.id,
            content: response.data?.content,
            status: response.status,
          });

          if (response.status === "error") {
            // Only show error if it's an actual authorization issue, not connection failure
            if (
              response.errors &&
              response.errors.includes("not in conversation")
            ) {
              shouldReconnect.current = false;
              toast.error("You are not part of this conversation", {
                id: "not-in-conversation",
              });
              wsRef.current?.close();
              return;
            }
            // For other errors, just log and don't show toast (might be connection issue)
            console.warn("WebSocket error response:", response.errors);
            return;
          }

          if (response.status && response.data) {
            const msg = response.data as Message;

            console.log("✅ Message sent confirmation received:", {
              messageId: msg.id,
              conversationId: msg.conversation_id,
              content: msg.content,
            });

            // Don't add message here - useGlobalMessageSocket will handle it
            // This WebSocket is only for sending messages and receiving confirmations
            console.log(
              "ℹ️ Skipping message add - useGlobalMessageSocket will handle it"
            );
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
          toast.error("Error receiving message", { id: "ws-parse-error" });
        }
      };

      ws.onerror = (event) => {
        // WebSocket errors don't provide detailed error info in the event
        console.error("WebSocket connection error occurred");
        // Don't show toast here, let onclose handle it
      };

      ws.onclose = (event) => {
        console.warn(
          `WebSocket closed: code ${event.code}, reason: ${
            event.reason || "No reason provided"
          }`
        );
        wsRef.current = null; // ✅ clear stale reference

        // Don't reconnect if explicitly closed (code 1000) or user not authorized
        if (event.code === 1000 || !shouldReconnect.current) {
          return;
        }

        if (isMounted.current && shouldReconnect.current) {
          reconnectAttempts.current += 1;
          if (reconnectAttempts.current <= maxReconnectAttempts) {
            console.log(
              `Reconnecting attempt ${reconnectAttempts.current}/${maxReconnectAttempts}...`
            );
            setTimeout(connectWebSocket, reconnectInterval);
          } else {
            console.error("Max reconnection attempts reached");
            toast.error("Failed to connect to chat. Please refresh the page.", {
              id: "reconnect-failed",
            });
            shouldReconnect.current = false;
          }
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      wsRef.current = null;

      // Retry connection if allowed
      if (isMounted.current && shouldReconnect.current) {
        reconnectAttempts.current += 1;
        if (reconnectAttempts.current <= maxReconnectAttempts) {
          setTimeout(connectWebSocket, reconnectInterval);
        } else {
          toast.error("Failed to connect to chat. Please refresh the page.", {
            id: "reconnect-failed",
          });
          shouldReconnect.current = false;
        }
      }
    }
  }, [conversationId, userId, addOrUpdateMessage, updateMessageStatus]);

  useEffect(() => {
    isMounted.current = true;
    connectWebSocket();

    return () => {
      isMounted.current = false;
      shouldReconnect.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  const sendMessage = useCallback((payload: string | object) => {
    console.log("🔍 DEBUG sendMessage called:", {
      payload,
      wsState: wsRef.current?.readyState,
      shouldReconnect: shouldReconnect.current,
    });

    if (!shouldReconnect.current) {
      toast.error("You are not part of this conversation", {
        id: "not-in-conversation",
      });
      return false;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        // If payload is already a string (JSON), send directly
        // Otherwise, wrap string content in object and stringify
        const messageToSend =
          typeof payload === "string" ? payload : JSON.stringify(payload);

        console.log("🔍 Sending message via WebSocket:", messageToSend);
        wsRef.current.send(messageToSend);
        return true;
      } catch (error) {
        console.error("Send error:", error);
        toast.error("Failed to send message", { id: "send-error" });
        return false;
      }
    }

    console.warn(
      "⚠️ WebSocket not connected. State:",
      wsRef.current?.readyState
    );
    toast.error("Disconnected. Message queued for retry.", {
      id: "ws-disconnected",
    });
    return false;
  }, []);

  return { sendMessage };
}
