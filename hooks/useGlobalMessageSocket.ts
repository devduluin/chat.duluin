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
  const processedMessageIds = useRef<Record<string, number>>({}); // Track processed events with timestamps

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
    },
    [], // No dependencies - stable function that uses ref
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
      const API_URL =
        process.env.NEXT_PUBLIC_WS_GATEWAY_URL ||
        "https://apidev-hrms.duluin.com/api/ws/v1/chat";
      if (!API_URL) {
        throw new Error("NEXT_PUBLIC_WS_GATEWAY_URL is not defined");
      }

      console.log("🔗 Building WebSocket URL from:", API_URL);

      // Parse the HTTP URL
      const url = new URL(API_URL);

      // Convert protocol: http -> ws, https -> wss
      const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";

      // Get authentication token from cookies
      const token =
        typeof window !== "undefined"
          ? document.cookie
              .split("; ")
              .find((row) => row.startsWith("app_token="))
              ?.split("=")[1] || ""
          : "";

      if (!token) {
        console.error(
          "❌ No app_token found in cookies - cannot establish WebSocket connection",
        );
        console.log("Available cookies:", document.cookie);
        toast.error("Authentication required. Please login.", {
          id: "ws-no-token",
        });
        return; // Don't attempt WebSocket connection without token
      }

      console.log("✅ Token found, proceeding with WebSocket connection");

      // Construct WebSocket URL: ws://host:port/path/userId?token=xxx
      const wsUrl = `${wsProtocol}//${url.host}${url.pathname}${url.pathname.endsWith("/") ? "" : "/"}${userId}?token=${encodeURIComponent(token)}`;

      console.log("🔗 WebSocket URL:", wsUrl.replace(token, "***TOKEN***")); // Hide token in logs

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("🌍✅ Global WebSocket CONNECTED for user:", userId);
        console.log("🌍 WebSocket readyState:", ws.readyState, "(1=OPEN)");
        setConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = async (event) => {
        try {
          console.log("🌍📨 [RAW] WebSocket data:", event.data);
          console.log(
            "🌍📨 [TYPE] Data type:",
            typeof event.data,
            event.data instanceof Blob ? "(Blob)" : "",
          );

          // Handle Blob data (convert to text first)
          let jsonData: string;
          if (event.data instanceof Blob) {
            console.log("🌍📨 [BLOB] Converting Blob to text...");
            jsonData = await event.data.text();
            console.log(
              "🌍📨 [BLOB] Converted text:",
              jsonData.substring(0, 200),
            );
          } else {
            jsonData = event.data;
          }

          // Check RAW data for delete message
          if (
            typeof jsonData === "string" &&
            jsonData.includes("message_deleted")
          ) {
            console.log("🔥🔥🔥 DELETE MESSAGE IN RAW DATA!");
          }

          const response = JSON.parse(jsonData);
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
              response.data.content,
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

            // Handle member added event
            const isMemberAddedMessage =
              msg.content?.startsWith("member_added:");
            if (isSystemMessage && isMemberAddedMessage) {
              // Format: "member_added:{userID}:{userName}:{groupName}"
              const parts = msg.content.split(":");
              const addedUserId = parts[1];
              const addedUserName = parts[2];
              const groupName = parts[3];

              // Create unique key for deduplication based on event + conversationId + userId
              const dedupeKey = `added_${msg.conversation_id}_${addedUserId}`;

              // Prevent duplicate processing - check if processed in last 5 seconds
              const now = Date.now();
              const lastProcessed = (processedMessageIds.current as any)[
                dedupeKey
              ];
              if (lastProcessed && now - lastProcessed < 5000) {
                console.log("⏭️ Skipping duplicate member_added event:", {
                  dedupeKey,
                  timeSinceLastProcess: now - lastProcessed,
                });
                return;
              }
              (processedMessageIds.current as any)[dedupeKey] = now;

              console.log("👥✅ MEMBER ADDED EVENT DETECTED!", {
                dedupeKey,
                addedUserId,
                addedUserName,
                groupName,
                conversationId: msg.conversation_id,
              });

              // Check if current user is the one added
              if (addedUserId === userId) {
                // Current user was added to group - update state immediately
                console.log(
                  "🎉 Current user added back to group, updating state...",
                );

                // Fetch latest conversation data to get full member list
                getConversationById(msg.conversation_id, userId)
                  .then((response) => {
                    if (response?.status && response?.data) {
                      const conversationData = response.data;

                      // IMPORTANT: Update members in chat store
                      useChatStore
                        .getState()
                        .setMembers(
                          msg.conversation_id,
                          conversationData.Members || [],
                        );
                      console.log(
                        "✅ Updated members list in chat store:",
                        conversationData.Members?.length,
                      );

                      // Update conversation in chat store with is_user_member: true
                      useChatStore
                        .getState()
                        .setConversation(msg.conversation_id, {
                          ...conversationData.Conversation,
                          members: conversationData.Members,
                          is_user_member: true, // User is now an active member again
                          display_name: conversationData.display_name,
                          display_avatar: conversationData.display_avatar,
                        } as any);
                      console.log(
                        "✅ Updated is_user_member to TRUE in chat store",
                      );

                      // Force increment version to trigger re-render
                      useChatStore.setState((state) => ({
                        _version: state._version + 1,
                      }));
                      console.log("✅ Force re-render triggered");

                      // Check if conversation already in sidebar
                      const conversationsInStore = useConversationsStore
                        .getState()
                        .conversations.find(
                          (c: any) => c.Conversation.id === msg.conversation_id,
                        );

                      if (conversationsInStore) {
                        // Update existing conversation
                        useConversationsStore
                          .getState()
                          .updateConversation(msg.conversation_id, {
                            is_user_member: true,
                          } as any);
                        console.log(
                          "✅ Updated is_user_member to TRUE in conversations store",
                        );

                        // Show toast notification
                        toast.success(`Added back to group`, {
                          description: `You were added back to ${groupName}`,
                        });
                      } else {
                        // Create new conversation entry for sidebar
                        const newConversation: RecentConversation = {
                          Conversation: {
                            id: conversationData.Conversation.id,
                            name: conversationData.Conversation.name,
                            avatar_url:
                              conversationData.Conversation.avatar_url,
                            is_group: conversationData.Conversation.is_group,
                            is_cross_tenant:
                              conversationData.Conversation.is_cross_tenant,
                            created_by:
                              conversationData.Conversation.created_by,
                            created_at:
                              conversationData.Conversation.created_at,
                            updated_at:
                              conversationData.Conversation.updated_at,
                            members: conversationData.Members,
                            messages: conversationData.Conversation.messages,
                            display_name:
                              conversationData.display_name ||
                              conversationData.Conversation.name,
                            display_avatar:
                              conversationData.display_avatar ||
                              conversationData.Conversation.avatar_url,
                            unread_count: 0,
                            is_user_member: true, // User is an active member
                          } as any,
                          LastMessage: msg,
                        };

                        // Add to conversation list
                        addNewConversation(newConversation);
                        console.log(
                          "✅ Group conversation added to sidebar:",
                          msg.conversation_id,
                        );

                        // Show toast notification
                        toast.success(`Added to group`, {
                          description: `You were added to ${groupName}`,
                        });
                      }
                    }
                  })
                  .catch((error) => {
                    console.error("Failed to fetch group conversation:", error);
                  });
              } else {
                // Another user was added - just refresh the member list for this conversation
                console.log(
                  "👤 Another user added to group, refreshing conversation...",
                );

                getConversationById(msg.conversation_id, userId)
                  .then((response) => {
                    if (response?.status && response?.data) {
                      const conversationData = response.data;

                      // Update members in chat store
                      useChatStore
                        .getState()
                        .setMembers(
                          msg.conversation_id,
                          conversationData.Members || [],
                        );

                      // Update conversation in chat store
                      if (conversationData.Conversation) {
                        useChatStore
                          .getState()
                          .setConversation(msg.conversation_id, {
                            ...conversationData.Conversation,
                            members: conversationData.Members,
                          });
                      }

                      console.log(
                        "✅ Members updated for conversation:",
                        msg.conversation_id,
                      );
                    }
                  })
                  .catch((error) => {
                    console.error(
                      "Failed to refresh conversation members:",
                      error,
                    );
                  });
              }

              // Add system message to chat
              addOrUpdateMessage(msg.conversation_id, {
                ...msg,
                content: `${addedUserName} was added to the group`,
                status: "sent",
              });

              // Update last message in sidebar
              setLastMessage(msg.conversation_id, {
                ...msg,
                content: `${addedUserName} was added to the group`,
              });

              // Don't process further for member added events
              return;
            }

            // Handle member removed event
            const isMemberRemovedMessage =
              msg.content?.startsWith("member_removed:");
            if (isSystemMessage && isMemberRemovedMessage) {
              // Format: "member_removed:{userID}:{userName}:{groupName}"
              const parts = msg.content.split(":");
              const removedUserId = parts[1];
              const removedUserName = parts[2];
              const groupName = parts[3];

              // Create unique key for deduplication based on event + conversationId + userId
              const dedupeKey = `removed_${msg.conversation_id}_${removedUserId}`;

              // Prevent duplicate processing - check if processed in last 5 seconds
              const now = Date.now();
              const lastProcessed = (processedMessageIds.current as any)[
                dedupeKey
              ];
              if (lastProcessed && now - lastProcessed < 5000) {
                console.log("⏭️ Skipping duplicate member_removed event:", {
                  dedupeKey,
                  timeSinceLastProcess: now - lastProcessed,
                });
                return;
              }
              (processedMessageIds.current as any)[dedupeKey] = now;

              console.log("👥❌ MEMBER REMOVED EVENT DETECTED!", {
                dedupeKey,
                messageId: msg.id,
                removedUserId,
                currentUserId: userId,
                removedUserName,
                groupName,
                conversationId: msg.conversation_id,
                isCurrentUser: removedUserId === userId,
                userIdType: typeof userId,
                removedUserIdType: typeof removedUserId,
              });

              // Check if current user is the one removed
              if (removedUserId === userId) {
                // Current user was removed from group - mark as not member
                console.log(
                  "🚫 Current user removed from group, marking as not member...",
                  {
                    removedUserId,
                    currentUserId: userId,
                    conversationId: msg.conversation_id,
                  },
                );

                // IMMEDIATELY mark user as not member (don't wait for API)
                const currentConversation =
                  useChatStore.getState().conversations[msg.conversation_id];
                if (currentConversation) {
                  useChatStore.getState().setConversation(msg.conversation_id, {
                    ...currentConversation,
                    is_user_member: false, // Flag to indicate user is no longer member
                  } as any);
                  console.log("✅ Set is_user_member to FALSE in chat store");
                }

                // Update members list - remove current user from members
                const currentMembers =
                  useChatStore.getState().members[msg.conversation_id] || [];
                const updatedMembers = currentMembers.filter((m: any) => {
                  const memberId =
                    m.user_id || m.UserID || m.user?.id || m.User?.id;
                  return memberId !== userId;
                });
                useChatStore
                  .getState()
                  .setMembers(msg.conversation_id, updatedMembers);
                console.log("✅ Removed current user from members list:", {
                  before: currentMembers.length,
                  after: updatedMembers.length,
                });

                // IMPORTANT: Keep conversation in useConversationsStore (sidebar)
                // Update the conversation in conversations list to mark as not member
                const conversationInList = conversations.find(
                  (item) => item.Conversation.id === msg.conversation_id,
                );
                if (conversationInList) {
                  // Update existing conversation with is_user_member flag
                  useConversationsStore
                    .getState()
                    .updateConversation(msg.conversation_id, {
                      ...conversationInList.Conversation,
                      is_user_member: false,
                    } as any);
                  console.log(
                    "✅ Set is_user_member to FALSE in conversations store",
                  );
                }

                // Force increment version to trigger re-render
                useChatStore.setState((state) => ({
                  _version: state._version + 1,
                }));
                console.log("✅ Force re-render triggered");

                // Show toast notification
                toast.error(`Removed from group`, {
                  description: `You were removed from ${groupName}. You can still view the chat history.`,
                });

                // Add system message to chat (make sure it's marked as system message)
                addOrUpdateMessage(msg.conversation_id, {
                  ...msg,
                  content: `You were removed from the group`,
                  message_type: "system",
                  is_system_message: true,
                  status: "sent",
                });
              } else {
                // Another user was removed - refresh the member list
                console.log(
                  "👤 Another user removed from group, refreshing conversation...",
                );

                getConversationById(msg.conversation_id, userId)
                  .then((response) => {
                    if (response?.status && response?.data) {
                      const conversationData = response.data;

                      // Update members in chat store
                      useChatStore
                        .getState()
                        .setMembers(
                          msg.conversation_id,
                          conversationData.Members || [],
                        );

                      // Update conversation in chat store
                      if (conversationData.Conversation) {
                        useChatStore
                          .getState()
                          .setConversation(msg.conversation_id, {
                            ...conversationData.Conversation,
                            members: conversationData.Members,
                          });
                      }

                      console.log(
                        "✅ Members updated for conversation:",
                        msg.conversation_id,
                      );
                    }
                  })
                  .catch((error) => {
                    console.error(
                      "Failed to refresh conversation members:",
                      error,
                    );
                  });

                // Add system message to chat
                addOrUpdateMessage(msg.conversation_id, {
                  ...msg,
                  content: `${removedUserName} was removed from the group`,
                  status: "sent",
                });

                // Update last message in sidebar
                setLastMessage(msg.conversation_id, {
                  ...msg,
                  content: `${removedUserName} was removed from the group`,
                });
              }

              // Don't process further for member removed events
              return;
            }

            // Check if user is still a member of this conversation (for removed users)
            const chatStoreConversation =
              useChatStore.getState().conversations[msg.conversation_id];
            const isUserNotMember =
              chatStoreConversation &&
              (chatStoreConversation as any).is_user_member === false;

            if (isUserNotMember && msg.message_type !== "system") {
              console.log(
                "🚫 User is not a member of this conversation - ignoring message:",
                msg.conversation_id,
                msg.id,
              );
              // Still update last message in conversations store for display
              setLastMessage(msg.conversation_id, msg);
              return; // Don't process further if user is not a member
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
                    m.status === "sending"),
              );

              if (optimisticMessage) {
                // Replace optimistic message with real message
                console.log(
                  "🔄 Found optimistic message to replace:",
                  optimisticMessage.id,
                  "→",
                  msg.id,
                );

                useChatStore
                  .getState()
                  .replaceOptimisticMessage(
                    msg.conversation_id,
                    optimisticMessage.id,
                    msg,
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
              (item) => item.Conversation.id === msg.conversation_id,
            );

            // AI Bot user ID - we don't want to show AI conversations in sidebar
            const AI_BOT_USER_ID = "1196e18b-c1dc-41aa-946a-0c55e9d64fe6";
            const isAIBotMessage = msg.sender_id === AI_BOT_USER_ID;

            if (!conversationExists) {
              // Check if this conversation exists in chat store but user is not a member
              const chatStoreConversation =
                useChatStore.getState().conversations[msg.conversation_id];
              const isUserNotMember =
                chatStoreConversation &&
                (chatStoreConversation as any).is_user_member === false;

              if (isUserNotMember) {
                console.log(
                  "🚫 User is not a member of this conversation - skipping fetch:",
                  msg.conversation_id,
                );
                return; // Don't fetch conversation if user is not a member
              }

              // Skip fetching and adding AI conversation to list
              if (isAIBotMessage) {
                console.log(
                  "🤖 AI Bot message detected - skipping conversation list update:",
                  msg.conversation_id,
                );
                return; // Don't add AI conversation to sidebar
              }

              // Conversation is new, fetch it from API
              console.log(
                "🆕 New conversation detected:",
                msg.conversation_id,
                "- Fetching details...",
              );

              // Prevent duplicate fetches
              if (!fetchingConversations.current.has(msg.conversation_id)) {
                fetchingConversations.current.add(msg.conversation_id);

                getConversationById(msg.conversation_id, userId)
                  .then((response) => {
                    if (response?.status && response?.data) {
                      const conversationData = response.data;

                      // Double check: filter out AI Assistant conversation
                      const isAIAssistant =
                        conversationData.display_name === "AI Assistant" ||
                        conversationData.Conversation?.name ===
                          "AI Assistant" ||
                        conversationData.other_user_id === AI_BOT_USER_ID;

                      if (isAIAssistant) {
                        console.log(
                          "🤖 AI Assistant conversation detected - NOT adding to sidebar:",
                          conversationData,
                        );
                        return; // Don't add to list
                      }

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
                        msg.conversation_id,
                      );

                      // Show toast notification for new conversation
                      /* toast.success("New conversation", {
                        description: `${msg.sender.first_name} ${msg.sender.last_name} started a conversation`,
                      }); */
                    }
                  })
                  .catch((error) => {
                    console.error("Failed to fetch new conversation:", error);

                    // If error is 500, likely user is not authorized (not a member)
                    // Mark conversation as not accessible
                    if (error?.response?.status === 500) {
                      console.log(
                        "🚫 User not authorized to access conversation (likely not a member):",
                        msg.conversation_id,
                      );

                      // Mark in chat store as not a member
                      useChatStore
                        .getState()
                        .setConversation(msg.conversation_id, {
                          id: msg.conversation_id,
                          name: "Group Chat",
                          avatar_url: "",
                          is_group: true,
                          is_cross_tenant: false,
                          created_by: "",
                          created_at: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                          members: [],
                          messages: null,
                          is_user_member: false, // Mark as not a member
                        } as any);
                    }
                  })
                  .finally(() => {
                    fetchingConversations.current.delete(msg.conversation_id);
                  });
              }
            } else {
              // Skip updating last message for AI conversation (no unread badge)
              if (isAIBotMessage) {
                console.log(
                  "🤖 AI Bot message - skipping last message update in sidebar",
                );
                return; // Don't update last message/unread count in sidebar
              }

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
                : "Unknown error",
          );
        }
      };

      ws.onclose = (event) => {
        console.warn(
          `🌍🔌 Global WebSocket closed: code ${event.code}, reason: ${
            event.reason || "No reason provided"
          }, wasClean: ${event.wasClean}`,
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
              `Reconnecting global WebSocket attempt ${reconnectAttempts.current}/${maxReconnectAttempts}...`,
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
    connectWebSocket(); // Initial connection attempt

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
