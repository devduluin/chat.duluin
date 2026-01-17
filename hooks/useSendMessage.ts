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
    }: SendMessageParams) => {
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
          first_name: firstName,
          last_name: lastName,
          email: email,
          avatar_url: avatarUrl,
          user_type: "employee",
        },
      };

      // Add to local store immediately (optimistic update)
      addMessage(conversationId, optimisticMessage);

      // Update conversation's last message
      setMessage(conversationId, optimisticMessage, senderId);

      console.log(
        isOnline
          ? "🟢 Online - sending message"
          : "🔴 Offline - queueing message",
        messageId
      );

      if (isOnline && sendViaWebSocket) {
        // Try to send via WebSocket
        const payload = {
          conversation_id: conversationId,
          content,
          parent_message_id: parentMessageId,
          attachment_ids: attachmentIds,
        };

        const success = sendViaWebSocket(payload);

        if (success) {
          // Message sent via WebSocket, will get confirmation via WebSocket events
          console.log("✅ Message sent via WebSocket");
          return { success: true, messageId };
        } else {
          // WebSocket failed, add to queue for retry
          console.log("⚠️ WebSocket failed, adding to queue");
          updateMessageStatus(messageId, conversationId, "pending");

          addToQueue({
            id: messageId,
            conversationId,
            content,
            senderId,
            tenantId,
            createdAt: now,
          });

          // Don't show toast - offline banner already visible
          return { success: false, messageId, queued: true };
        }
      } else {
        // Offline mode - add to queue
        addToQueue({
          id: messageId,
          conversationId,
          content,
          senderId,
          tenantId,
          createdAt: now,
        });

        toast.info(
          "Offline - message will be sent when connection is restored"
        );
        return { success: false, messageId, queued: true };
      }
    },
    [addMessage, setMessage, updateMessageStatus, addToQueue, isOnline]
  );

  return { sendMessage };
};
