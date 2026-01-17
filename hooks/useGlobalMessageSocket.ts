// hooks/useGlobalMessageSocket.ts
import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "@/store/useChatStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { toast } from "sonner";
import { getConversationById } from "@/services/v1/conversationService";

// Type definitions for conversation structure
interface RecentConversation {
  Conversation: any;
  LastMessage: Message;
}

/**
 * Global WebSocket hook for receiving messages from ALL conversations
 * This enables real-time unread counter updates across all conversations
 */
export function useGlobalMessageSocket(userId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 3;
  const reconnectInterval = 5000;
  const isMounted = useRef(false);
  const shouldReconnect = useRef(true);
  const fetchingConversations = useRef<Set<string>>(new Set());

  const addOrUpdateMessage = useChatStore((s) => s.addOrUpdateMessage);
  const setLastMessage = useConversationsStore((s) => s.setMessage);
  const addNewConversation = useConversationsStore((s) => s.addNewConversation);
  const conversations = useConversationsStore((s) => s.conversations);

  const connectWebSocket = useCallback(() => {
    // Prevent duplicate connection attempts
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      console.log("Global WebSocket already connected or connecting.");
      return;
    }

    if (!isMounted.current || !shouldReconnect.current || !userId) return;

    try {
      const ws = new WebSocket(`ws://localhost:3000/api/v1/chat/${userId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("🌍✅ Global WebSocket CONNECTED for user:", userId);
        console.log("🌍 WebSocket readyState:", ws.readyState, "(1=OPEN)");
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          console.log("🌍📨 Global WebSocket RAW data received:", event.data);
          const response = JSON.parse(event.data);
          console.log("🌍📨 Parsed response:", response);

          if (response.status === "error") {
            console.error("🌍❌ WebSocket error:", response.errors);
            return;
          }

          if (response.status && response.data) {
            const msg = response.data as Message;

            console.log("🌍✅ Global WebSocket received message:", {
              messageId: msg.id,
              conversationId: msg.conversation_id,
              content: msg.content,
              sender: msg.sender?.first_name,
              updated_at: msg.updated_at,
            });

            // Check if this is a message we sent (to replace optimistic message)
            const convMsgs =
              useChatStore.getState().messages[msg.conversation_id] || [];

            // Find optimistic message by matching criteria
            const optimisticMessage = convMsgs.find(
              (m) =>
                m.sender_id === msg.sender_id &&
                m.content === msg.content &&
                m.conversation_id === msg.conversation_id &&
                // Match messages with pending status or no status (optimistic UI)
                (m.status === "pending" ||
                  !m.status ||
                  m.status === "sending") &&
                // Check timestamp difference (within 30 seconds either direction)
                Math.abs(
                  new Date(msg.created_at).getTime() -
                    new Date(m.created_at).getTime()
                ) < 30000
            );

            if (optimisticMessage) {
              // Replace optimistic message with real message using dedicated method
              console.log(
                "🔄 Found optimistic message to replace:",
                optimisticMessage.id,
                "→",
                msg.id
              );

              useChatStore
                .getState()
                .replaceOptimisticMessage(
                  msg.conversation_id,
                  optimisticMessage.id,
                  msg
                );
            } else {
              // ALWAYS add or update message to chat store (for all conversations)
              // This ensures that even if conversation is open, it gets the update
              console.log("➡️ Calling addOrUpdateMessage from GlobalWebSocket");
              addOrUpdateMessage(msg.conversation_id, {
                ...msg,
                status: "sent",
              });
            }

            // Also update the last message in conversations store
            console.log("➡️ Calling setLastMessage from GlobalWebSocket");
            setLastMessage(msg.conversation_id, msg);

            // Check if conversation exists in the list
            const conversationExists = conversations.some(
              (item) => item.Conversation.id === msg.conversation_id
            );

            if (!conversationExists) {
              // Conversation is new, fetch it from API
              console.log(
                "🆕 New conversation detected:",
                msg.conversation_id,
                "- Fetching details..."
              );

              // Prevent duplicate fetches
              if (!fetchingConversations.current.has(msg.conversation_id)) {
                fetchingConversations.current.add(msg.conversation_id);

                getConversationById(msg.conversation_id, userId)
                  .then((response) => {
                    if (response?.status && response?.data) {
                      const conversationData = response.data;

                      // Create RecentConversation object
                      const newConversation: RecentConversation = {
                        Conversation: {
                          id: conversationData.Conversation.id,
                          name: conversationData.Conversation.name,
                          avatar_url: conversationData.Conversation.avatar_url,
                          is_group: conversationData.Conversation.is_group,
                          is_cross_tenant:
                            conversationData.Conversation.is_cross_tenant,
                          created_by: conversationData.Conversation.created_by,
                          created_at: conversationData.Conversation.created_at,
                          updated_at: conversationData.Conversation.updated_at,
                          members: conversationData.Conversation.members,
                          messages: conversationData.Conversation.messages,
                          display_name:
                            conversationData.display_name ||
                            conversationData.Conversation.name,
                          display_avatar:
                            conversationData.display_avatar ||
                            conversationData.Conversation.avatar_url,
                          unread_count: 1, // Set to 1 for the new message
                        } as any,
                        LastMessage: msg,
                      };

                      // Add to conversation list
                      addNewConversation(newConversation);
                      console.log(
                        "✅ New conversation added to list:",
                        msg.conversation_id
                      );

                      // Show toast notification for new conversation
                      toast.success("New conversation", {
                        description: `${msg.sender.first_name} ${msg.sender.last_name} started a conversation`,
                      });
                    }
                  })
                  .catch((error) => {
                    console.error("Failed to fetch new conversation:", error);
                  })
                  .finally(() => {
                    fetchingConversations.current.delete(msg.conversation_id);
                  });
              }
            } else {
              // Conversation exists, update last message and unread count
              setLastMessage(msg.conversation_id, msg, userId);
            }
          }
        } catch (err) {
          console.error("Failed to parse global WebSocket message:", err);
        }
      };

      ws.onerror = (event) => {
        // Suppress error 0 which is just a generic connection failure
        if (event && (event as any).type) {
          console.warn(
            "🌍⚠️ Global WebSocket connection issue:",
            ws.readyState === WebSocket.CONNECTING
              ? "Still connecting..."
              : ws.readyState === WebSocket.CLOSED
              ? "Connection closed"
              : "Unknown error"
          );
        }
      };

      ws.onclose = (event) => {
        console.warn(
          `🌍🔌 Global WebSocket closed: code ${event.code}, reason: ${
            event.reason || "No reason provided"
          }, wasClean: ${event.wasClean}`
        );
        console.log("🌍 Close event details:", {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          isMounted: isMounted.current,
          shouldReconnect: shouldReconnect.current,
        });
        wsRef.current = null;

        // Don't reconnect if explicitly closed (code 1000)
        if (event.code === 1000 || !shouldReconnect.current) {
          return;
        }

        if (isMounted.current && shouldReconnect.current) {
          reconnectAttempts.current += 1;
          if (reconnectAttempts.current <= maxReconnectAttempts) {
            console.log(
              `Reconnecting global WebSocket attempt ${reconnectAttempts.current}/${maxReconnectAttempts}...`
            );
            setTimeout(connectWebSocket, reconnectInterval);
          } else {
            console.error("Max global WebSocket reconnection attempts reached");
            shouldReconnect.current = false;
          }
        }
      };
    } catch (error) {
      console.error("Failed to create global WebSocket connection:", error);
      wsRef.current = null;

      // Retry connection if allowed
      if (isMounted.current && shouldReconnect.current) {
        reconnectAttempts.current += 1;
        if (reconnectAttempts.current <= maxReconnectAttempts) {
          setTimeout(connectWebSocket, reconnectInterval);
        } else {
          shouldReconnect.current = false;
        }
      }
    }
  }, [
    userId,
    addOrUpdateMessage,
    setLastMessage,
    addNewConversation,
    conversations,
  ]);

  useEffect(() => {
    if (!userId) return;

    isMounted.current = true;
    connectWebSocket();

    return () => {
      isMounted.current = false;
      shouldReconnect.current = false;
      if (wsRef.current) {
        console.log("Closing global WebSocket connection");
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket]);

  // Return connection status for debugging
  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
