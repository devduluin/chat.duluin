import { getConversationById } from "@/services/v1/conversationService";
import { persistInboundRelayMessage } from "@/lib/message-archive";
import {
  getSentPlaintext,
  remapSentPlaintext,
  cacheSentPlaintext,
} from "@/lib/e2ee/sent-plaintext-cache";
import { resolveMessageForDisplay } from "@/lib/e2ee/message-preview";
import { useChatStore } from "@/store/useChatStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import type { RecentConversation, WsHandlerContext } from "../../types";
import { AI_BOT_USER_ID, isAIAssistantConversation } from "./constants";
import { findOutboundOptimisticMessage } from "./utils";

export async function handleIncomingMessage(
  msg: Message,
  messageType: string,
  ctx: WsHandlerContext,
): Promise<void> {


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
    ctx.setLastMessage(msg.conversation_id, msg);
    return; // Don't process further if user is not a member
  }

  // Dedupe WS deliveries (ack + broadcast can arrive for the same message).
  if (msg.id) {
    const lastSeen = ctx.processedMessageIds.current[msg.id];
    const now = Date.now();
    if (lastSeen && now - lastSeen < 5000) {
      console.log("⏭️ Skipping duplicate WS message:", msg.id);
      return;
    }
    ctx.processedMessageIds.current[msg.id] = now;
  }

  // Check if message already exists in store
  const convMsgs =
    useChatStore.getState().messages[msg.conversation_id] || [];
  const existingMessage = convMsgs.find((m) => m.id === msg.id);

  if (existingMessage) {
    // Message already exists, just update it
    console.log("🔄 Message already exists, updating:", msg.id);

    let preservedContent = existingMessage.content;
    if (
      messageType === "e2ee_text" &&
      msg.sender_id === ctx.userId &&
      (!preservedContent || preservedContent.startsWith("🔒"))
    ) {
      preservedContent =
        getSentPlaintext(msg.id) || preservedContent;
    }

    const updatedMessage =
      messageType === "e2ee_text" &&
      msg.sender_id === ctx.userId &&
      preservedContent &&
      !preservedContent.startsWith("🔒")
        ? { ...msg, content: preservedContent, status: "sent" as const }
        : { ...msg, status: "sent" as const };

    ctx.addOrUpdateMessage(msg.conversation_id, updatedMessage);
  } else {
    const optimisticMessage = findOutboundOptimisticMessage(
      convMsgs,
      msg,
      ctx.userId,
    );

    if (optimisticMessage) {
      // Replace optimistic message with real message
      console.log(
        "🔄 Found optimistic message to replace:",
        optimisticMessage.id,
        "→",
        msg.id,
      );

      const mergedMessage =
        messageType === "e2ee_text" && msg.sender_id === ctx.userId
          ? { ...msg, content: optimisticMessage.content }
          : msg;

      if (messageType === "e2ee_text" && msg.sender_id === ctx.userId) {
        remapSentPlaintext(optimisticMessage.id, msg.id);
        if (optimisticMessage.content) {
          cacheSentPlaintext(msg.id, optimisticMessage.content);
        }
      }

      useChatStore
        .getState()
        .replaceOptimisticMessage(
          msg.conversation_id,
          optimisticMessage.id,
          mergedMessage,
        );
      await persistInboundRelayMessage(
        { ...mergedMessage, status: "sent" as const },
        ctx.userId,
      );
    } else {
      // Add as new message (already decrypted in preprocessE2ee when e2ee_text)
      console.log("➕ Adding NEW message from GlobalWebSocket:", {
        id: msg.id,
        conversationId: msg.conversation_id,
        content: msg.content,
        sender: msg.sender?.first_name,
      });

      const messageToStore = {
        ...msg,
        status: "sent" as const,
      };
      ctx.addOrUpdateMessage(msg.conversation_id, messageToStore);
      await persistInboundRelayMessage(messageToStore, ctx.userId);
    }
  }

  // Check if conversation exists in the list (using getState() to avoid stale closures)
  const conversationExists = useConversationsStore.getState().conversations.some(
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
    if (!ctx.fetchingConversations.current.has(msg.conversation_id)) {
      ctx.fetchingConversations.current.add(msg.conversation_id);

      getConversationById(msg.conversation_id, ctx.userId)
        .then((response) => {
          if (response?.status && response?.data) {
            const conversationData = response.data;

            // Double check: filter out AI Assistant conversation
            if (isAIAssistantConversation(conversationData)) {
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
                unread_count: msg.sender_id === ctx.userId ? 0 : 1,
              } as any,
              LastMessage: msg,
            };

            // Add to conversation list
            ctx.addNewConversation(newConversation);
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
          ctx.fetchingConversations.current.delete(msg.conversation_id);
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
    const sidebarMessage =
      messageType === "e2ee_text"
        ? await resolveMessageForDisplay(msg, ctx.userId)
        : msg;
    ctx.setLastMessage(msg.conversation_id, sidebarMessage, ctx.userId);

    // Trigger notification for incoming messages from others
    ctx.triggerNotification(msg);
  }
}
