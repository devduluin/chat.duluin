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

  const addMessage = useChatStore((s) => s.addMessage);
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
        console.log("Global WebSocket connected for user:", userId);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);

          if (response.status === "error") {
            console.error("WebSocket error:", response.errors);
            return;
          }

          if (response.status && response.data) {
            const msg = response.data as Message;

            // Add message to chat store if conversation is currently open
            const currentMessages = useChatStore.getState().messages;
            if (currentMessages[msg.conversation_id]) {
              addMessage(msg.conversation_id, { ...msg, status: "sent" });
            }

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
        console.error("Global WebSocket connection error occurred");
      };

      ws.onclose = (event) => {
        console.warn(
          `Global WebSocket closed: code ${event.code}, reason: ${
            event.reason || "No reason provided"
          }`
        );
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
  }, [userId, addMessage, setLastMessage, addNewConversation, conversations]);

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
