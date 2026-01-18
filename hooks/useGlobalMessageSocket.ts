// hooks/useGlobalMessageSocket.ts
import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "@/store/useChatStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { toast } from "sonner";
import { getConversationById } from "@/services/v1/conversationService";

// Type definitions for conversation structure
interface RecentConversation {
  Conversation: any;
  LastMessage: Message;
}

/**
 * Global WebSocket hook - SINGLE WebSocket for ALL conversations
 * Handles both sending and receiving messages in real-time
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
  const { setSendMessage, setConnected } = useWebSocketStore();

  // Send message function - stable reference, always uses current wsRef
  const sendMessageStable = useCallback(
    (payload: string | object) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn(
          "⚠️ WebSocket not connected. State:",
          wsRef.current?.readyState
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
    },
    [] // No dependencies - stable function that uses ref
  );

  // Set sendMessage to store immediately on mount
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

    // Prevent duplicate connection attempts
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      console.log("Global WebSocket already connected or connecting.");
      return;
    }

    if (
      !isMounted.current ||
      !shouldReconnect.current ||
      !userId ||
      userId.trim() === ""
    ) {
      console.log("⏸️ Cannot connect WebSocket:", {
        isMounted: isMounted.current,
        shouldReconnect: shouldReconnect.current,
        userId: userId || "empty",
      });
      return;
    }

    try {
      const ws = new WebSocket(`ws://localhost:3000/api/v1/chat/${userId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("🌍✅ Global WebSocket CONNECTED for user:", userId);
        console.log("🌍 WebSocket readyState:", ws.readyState, "(1=OPEN)");
        setConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          console.log("🌍📨 [RAW] WebSocket data:", event.data);

          // Check RAW data for delete message
          if (
            typeof event.data === "string" &&
            event.data.includes("message_deleted")
          ) {
            console.log("🔥🔥🔥 DELETE MESSAGE IN RAW DATA!");
          }

          const response = JSON.parse(event.data);
          console.log("🌍📨 [PARSED] Full response:", {
            status: response.status,
            message: response.message,
            data: response.data,
            hasData: !!response.data,
            dataType: typeof response.data,
          });

          // Check parsed data for delete
          if (response.data?.content?.includes("message_deleted")) {
            console.log(
              "🔥🔥🔥 DELETE CONTENT IN PARSED DATA:",
              response.data.content
            );
          }

          if (response.status === "error") {
            console.error("🌍❌ WebSocket error:", response.errors);
            return;
          }

          if (response.status && response.data) {
            const msg = response.data as Message;

            console.log("🌍✅ [MSG] Message details:", {
              messageId: msg.id,
              conversationId: msg.conversation_id,
              content: msg.content,
              messageType: msg.message_type,
              MessageType: (msg as any).MessageType,
              sender: msg.sender?.first_name,
              allKeys: Object.keys(msg),
            });

            // Handle message deletion event - CHECK THIS FIRST
            // Try both snake_case and PascalCase
            const isSystemMessage =
              msg.message_type === "system" ||
              (msg as any).MessageType === "system";
            const isDeleteMessage = msg.content?.startsWith("message_deleted:");

            console.log("🔍 Checking delete conditions:", {
              isSystemMessage,
              isDeleteMessage,
              message_type: msg.message_type,
              MessageType: (msg as any).MessageType,
              content: msg.content,
              contentStartsWith: msg.content?.substring(0, 20),
            });

            if (isSystemMessage && isDeleteMessage) {
              // Format: "message_deleted:{messageID}:{deleteForEveryone}:{isGroupConversation}"
              const parts = msg.content.split(":");
              const deletedMessageId = parts[1]; // The actual message ID being deleted
              const deleteForEveryone = parts[2] === "true";

              console.log("🗑️🔥 DELETE EVENT DETECTED!", {
                deletedMessageId,
                conversationId: msg.conversation_id,
                deleteForEveryone,
                fullContent: msg.content,
                parts: parts,
              });

              // Remove message from store using the correct message ID
              console.log("🗑️ Calling removeMessage...");
              useChatStore
                .getState()
                .removeMessage(msg.conversation_id, deletedMessageId);

              console.log("🗑️✅ removeMessage completed");

              // Don't process further for delete events
              return;
            }

            // Check if message already exists in store
            const convMsgs =
              useChatStore.getState().messages[msg.conversation_id] || [];
            const existingMessage = convMsgs.find((m) => m.id === msg.id);

            if (existingMessage) {
              // Message already exists, just update it
              console.log("🔄 Message already exists, updating:", msg.id);
              addOrUpdateMessage(msg.conversation_id, {
                ...msg,
                status: "sent",
              });
            } else {
              // New message, check if there's an optimistic message to replace
              const optimisticMessage = convMsgs.find(
                (m) =>
                  m.sender_id === msg.sender_id &&
                  m.content === msg.content &&
                  m.conversation_id === msg.conversation_id &&
                  // Match messages with pending status
                  (m.status === "pending" ||
                    !m.status ||
                    m.status === "sending")
              );

              if (optimisticMessage) {
                // Replace optimistic message with real message
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
                // Add as new message
                console.log("➕ Adding NEW message from GlobalWebSocket:", {
                  id: msg.id,
                  conversationId: msg.conversation_id,
                  content: msg.content,
                  sender: msg.sender?.first_name,
                });
                addOrUpdateMessage(msg.conversation_id, {
                  ...msg,
                  status: "sent",
                });
              }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only userId - all others use refs or direct calls

  useEffect(() => {
    if (!userId || userId.trim() === "") {
      console.log("⏸️ Skipping WebSocket - no userId");
      return;
    }

    isMounted.current = true;
    connectWebSocket();

    return () => {
      isMounted.current = false;
      shouldReconnect.current = false;
      setConnected(false);
      setConnected(false);
      if (wsRef.current) {
        console.log("Closing global WebSocket connection");
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, setConnected]); // Only re-run when userId changes

  // Return connection status and sendMessage function
  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    sendMessage: sendMessageStable,
  };
}
