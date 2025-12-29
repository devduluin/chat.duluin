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

  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessageStatus = useChatStore((s) => s.updateMessageStatus);
  // Note: setLastMessage removed - Global WebSocket handles conversation list updates

  const connectWebSocket = useCallback(() => {
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
        console.log("WebSocket connected");
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
          const response = JSON.parse(event.data);

          if (response.status === "error") {
            if (response.errors) {
              shouldReconnect.current = false;
              toast.error("You are not part of this conversation", {
                id: "not-in-conversation",
              });
              wsRef.current?.close();
              return;
            }
            return;
          }

          if (response.status && response.data) {
            const msg = response.data as Message;

            if (msg.conversation_id === conversationId) {
              addMessage(conversationId, { ...msg, status: "sent" });
              // Note: Don't update conversation list here - Global WebSocket handles that
              // This prevents double-incrementing unread counter
            }
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
  }, [conversationId, userId, addMessage, updateMessageStatus]);

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

        wsRef.current.send(messageToSend);
        return true;
      } catch (error) {
        console.error("Send error:", error);
        toast.error("Failed to send message", { id: "send-error" });
        return false;
      }
    }

    toast.error("Disconnected. Message queued for retry.", {
      id: "ws-disconnected",
    });
    return false;
  }, []);

  return { sendMessage };
}
