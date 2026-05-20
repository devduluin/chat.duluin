// hooks/useSendMessage.ts
import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useChatStore } from "@/store/useChatStore";
import { useOfflineQueueStore } from "@/store/useOfflineQueueStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { toast } from "sonner";
import Cookies from "js-cookie";

interface SendMessageParams {
  conversationId: string;
  content: string;
  senderId: string;
  tenantId: string;
  parentMessageId?: string;
  attachmentIds?: string[];
  sendViaWebSocket?: (payload: any) => boolean;
  recipientId?: string;
}

export const useSendMessage = () => {
  const { addMessage, updateMessageStatus } = useChatStore();
  const { addToQueue, isOnline } = useOfflineQueueStore();
  const { setMessage } = useConversationsStore();

  const sendMessage = useCallback(
    async ({
      conversationId,
      content,
      senderId,
      tenantId,
      parentMessageId,
      attachmentIds,
      sendViaWebSocket,
      recipientId,
    }: SendMessageParams) => {
      // Handle new direct conversation creation on first message send
      if (conversationId === "new" && recipientId) {
        try {
          const { sendDirectMessage } = await import("@/services/v1/messageService");
          const response = await sendDirectMessage({
            recipient_id: recipientId,
            sender_id: senderId,
            tenant_id: tenantId,
            content,
            message_type: "text",
          });

          if (response && response.status && response.data) {
            const newMsg = response.data;
            const newConversationId = newMsg.conversation_id;
            return { success: true, messageId: newMsg.id, conversationId: newConversationId };
          } else {
            toast.error(response?.message || "Failed to start direct conversation");
            return { success: false };
          }
        } catch (error: any) {
          toast.error(error?.message || "Error starting conversation");
          return { success: false };
        }
      }

      const messageId = uuidv4();
      const now = new Date();

      // Get user info from cookies for sender object
      const firstName = Cookies.get("first_name") || "User";
      const lastName = Cookies.get("last_name") || "";
      const email = Cookies.get("email") || "";
      const avatarUrl = Cookies.get("avatar_url") || "";

      // Create optimistic message for UI
      const optimisticMessage: Message = {
        id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: "text",
        // Don't show loader - assume message will be sent (optimistic UI)
        status: isOnline ? undefined : "pending",
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        read_at: null,
        parent_message_id: parentMessageId || null,
        sender: {
          id: senderId,
          tenant_id: "",
          email: email,
          first_name: firstName,
          last_name: lastName,
          avatar_url: avatarUrl,
          status: "online",
          last_seen_at: now.toISOString(),
          user_type: "employee",
          contact_visibility: "public",
          allow_contact_requests: true,
          auto_approve_contacts: false,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
      };

      // Add to local store immediately (optimistic update)
      addMessage(conversationId, optimisticMessage);

      // Update conversation's last message
      setMessage(conversationId, optimisticMessage, senderId);

      console.log(
        isOnline
          ? sendViaWebSocket
            ? "🟢 Online + WebSocket available - sending via WebSocket"
            : "🟡 Online but WebSocket not ready - will queue and sync via HTTP"
          : "🔴 Offline - queueing message for later",
        messageId,
      );

      // Priority 1: If online AND WebSocket available, send via WebSocket
      if (isOnline && sendViaWebSocket) {
        const payload = {
          conversation_id: conversationId,
          content,
          parent_message_id: parentMessageId,
          attachment_ids: attachmentIds,
        };

        const success = sendViaWebSocket(payload);

        if (success) {
          // Message sent via WebSocket successfully
          console.log("✅ Message sent via WebSocket");
          return { success: true, messageId };
        } else {
          // WebSocket failed, fallback to queue + HTTP
          console.warn(
            "⚠️ WebSocket send failed, adding to queue for HTTP sync",
          );
          updateMessageStatus(messageId, conversationId, "pending");

          addToQueue({
            id: messageId,
            conversationId,
            content,
            senderId,
            tenantId,
            createdAt: now,
          });

          return { success: false, messageId, queued: true };
        }
      } else {
        // Priority 2: Offline or WebSocket not ready - add to queue for HTTP sync
        console.log(
          "📥 Adding message to queue (will sync via HTTP when online)",
        );
        updateMessageStatus(messageId, conversationId, "pending");

        addToQueue({
          id: messageId,
          conversationId,
          content,
          senderId,
          tenantId,
          createdAt: now,
        });

        if (!isOnline) {
          toast.info(
            "Offline - message will be sent when connection is restored",
            {
              id: "offline-queue",
            },
          );
        }

        return { success: false, messageId, queued: true };
      }
    },
    [addMessage, setMessage, updateMessageStatus, addToQueue, isOnline],
  );

  return { sendMessage };
};
