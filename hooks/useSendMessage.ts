// hooks/useSendMessage.ts
import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useChatStore } from "@/store/useChatStore";
import { useOfflineQueueStore } from "@/store/useOfflineQueueStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { encryptMessageForUser } from "@/lib/e2ee/message-crypto";
import { ensureDeviceRegistered } from "@/lib/e2ee/device-manager";
import { recipientHasRegisteredDevices } from "@/services/v1/e2eeService";
import { cacheSentPlaintext } from "@/lib/e2ee/sent-plaintext-cache";
import type { SecurityMode } from "@/lib/e2ee/types";
import {
  activateConversationE2EE,
  isDirectMessageEligibleForAutoE2EE,
} from "@/lib/e2ee/activate-conversation-e2ee";

interface SendMessageParams {
  conversationId: string;
  content: string;
  senderId: string;
  tenantId: string;
  parentMessageId?: string;
  attachmentIds?: string[];
  sendViaWebSocket?: (payload: any) => boolean;
  recipientId?: string;
  securityMode?: SecurityMode;
}

function resolveSecurityMode(conversationId: string): SecurityMode {
  const conversations = useConversationsStore.getState().conversations;
  const match = conversations.find((item) => item.Conversation.id === conversationId);
  const fromSidebar = (match?.Conversation as any)?.security_mode;

  const chatConv = useChatStore.getState().conversations[conversationId];
  const fromChat = (chatConv as any)?.security_mode;

  const mode = fromSidebar || fromChat;
  return mode === "e2ee" ? "e2ee" : "plain";
}

function resolveRecipientUserId(
  conversationId: string,
  senderId: string,
  explicitRecipientId?: string,
): string | null {
  if (explicitRecipientId) return explicitRecipientId;

  const conversations = useConversationsStore.getState().conversations;
  const match = conversations.find((item) => item.Conversation.id === conversationId);
  const members = match?.Conversation?.members || [];
  const otherMember = members.find((member: any) => member.user_id !== senderId);
  return otherMember?.user_id || null;
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
      securityMode,
    }: SendMessageParams) => {
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
          }

          toast.error(response?.message || "Failed to start direct conversation");
          return { success: false };
        } catch (error: any) {
          toast.error(error?.message || "Error starting conversation");
          return { success: false };
        }
      }

      let mode = securityMode || resolveSecurityMode(conversationId);

      if (
        mode === "plain" &&
        isDirectMessageEligibleForAutoE2EE(conversationId)
      ) {
        const activation = await activateConversationE2EE(
          conversationId,
          senderId,
        );
        if (!activation.ok) {
          toast.error(
            activation.error ||
              "Gagal mengaktifkan enkripsi. Coba lagi dalam beberapa saat.",
          );
          return { success: false };
        }

        if (!activation.readiness?.can_send_encrypted) {
          toast.error(
            "Kontak belum siap menerima pesan terenkripsi. Minta mereka membuka aplikasi chat terlebih dahulu.",
            { duration: 6000 },
          );
          return { success: false };
        }

        mode = "e2ee";
        useChatStore.getState().showE2eeActivationBanner(conversationId);
      }

      const messageId = uuidv4();
      const now = new Date();

      if (mode === "e2ee") {
        try {
          await ensureDeviceRegistered(senderId);
        } catch (error) {
          console.error("Failed to register E2EE device:", error);
          toast.error("Gagal menyiapkan enkripsi di perangkat ini. Muat ulang halaman lalu coba lagi.");
          return { success: false };
        }

        const recipientUserId = resolveRecipientUserId(
          conversationId,
          senderId,
          recipientId,
        );
        if (!recipientUserId) {
          toast.error("Tidak dapat mengirim pesan terenkripsi: kontak tidak ditemukan");
          return { success: false };
        }

        const recipientReady = await recipientHasRegisteredDevices(recipientUserId);
        if (!recipientReady) {
          toast.error(
            "Kontak belum siap menerima pesan terenkripsi. Minta mereka membuka aplikasi chat terlebih dahulu.",
          );
          return { success: false };
        }
      }

      const firstName = Cookies.get("first_name") || "User";
      const lastName = Cookies.get("last_name") || "";
      const email = Cookies.get("email") || "";
      const avatarUrl = Cookies.get("avatar_url") || "";

      const optimisticMessage: Message = {
        id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        message_type: mode === "e2ee" ? "e2ee_text" : "text",
        status: isOnline ? "sending" : "pending",
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

      addMessage(conversationId, optimisticMessage);
      setMessage(conversationId, optimisticMessage, senderId);

      if (mode === "e2ee") {
        cacheSentPlaintext(messageId, content);
      }

      if (isOnline && sendViaWebSocket) {
        try {
          let payload: Record<string, unknown>;

          if (mode === "e2ee") {
            const recipientUserId = resolveRecipientUserId(
              conversationId,
              senderId,
              recipientId,
            );
            if (!recipientUserId) {
              toast.error("Tidak dapat mengirim pesan terenkripsi: kontak tidak ditemukan");
              useChatStore.getState().removeMessage(conversationId, messageId);
              return { success: false, messageId };
            }

            const encrypted = await encryptMessageForUser(
              senderId,
              recipientUserId,
              content,
            );

            payload = {
              type: "e2ee_text",
              conversation_id: conversationId,
              ciphertext: encrypted.ciphertext,
              e2ee: encrypted.e2ee,
              parent_message_id: parentMessageId,
              attachment_ids: attachmentIds,
            };
          } else {
            payload = {
              conversation_id: conversationId,
              content,
              parent_message_id: parentMessageId,
              attachment_ids: attachmentIds,
            };
          }

          const success = sendViaWebSocket(payload);
          if (success) {
            return { success: true, messageId };
          }
        } catch (error) {
          console.error("Failed to send message:", error);
          useChatStore.getState().removeMessage(conversationId, messageId);
          const message =
            error instanceof Error &&
            (error.message.includes("No key bundles") ||
              error.message.includes("no active devices"))
              ? "Kontak belum siap menerima pesan terenkripsi. Minta mereka membuka aplikasi chat."
              : "Gagal mengirim pesan terenkripsi";
          toast.error(message);
        }

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

      if (mode === "e2ee") {
        toast.error("Encrypted messages require an active WebSocket connection");
        return { success: false, messageId };
      }

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
        toast.info("Offline - message will be sent when connection is restored", {
          id: "offline-queue",
        });
      }

      return { success: false, messageId, queued: true };
    },
    [addMessage, setMessage, updateMessageStatus, addToQueue, isOnline],
  );

  return { sendMessage };
};
