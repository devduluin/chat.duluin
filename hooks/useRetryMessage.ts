// hooks/useRetryMessage.ts
import { useCallback } from "react";
import { useOfflineQueueStore } from "@/store/useOfflineQueueStore";
import { useChatStore } from "@/store/useChatStore";
import { toast } from "sonner";
import { sendMessage as sendMessageAPI } from "@/services/v1/messageService";

export const useRetryMessage = () => {
  const { retryMessage, isOnline, removeFromQueue, updateQueueItem } =
    useOfflineQueueStore();
  const { updateMessageStatus, replaceOptimisticMessage } = useChatStore();

  const retry = useCallback(
    async (messageId: string, conversationId: string) => {
      if (!isOnline) {
        toast.info(
          "You're offline. Message will retry automatically when back online."
        );
        return;
      }

      // Update message status in UI to show it's being retried
      updateMessageStatus(messageId, conversationId, "sending");

      // Reset the message in the queue to pending status
      retryMessage(messageId);

      console.log("🔄 Manual retry triggered for message:", messageId);

      // Get message from queue
      const queue = useOfflineQueueStore.getState().queue;
      const queuedMsg = queue.find((m) => m.id === messageId);

      if (!queuedMsg) {
        console.error("Message not found in queue:", messageId);
        return;
      }

      try {
        // Immediately try to send via REST API
        const response = await sendMessageAPI({
          conversation_id: queuedMsg.conversationId,
          sender_id: queuedMsg.senderId,
          tenant_id: queuedMsg.tenantId,
          content: queuedMsg.content,
          message_type: "text",
        });

        if (response && response.status) {
          console.log("✅ Message sent successfully:", messageId);

          // Get real message from backend response
          const realMessage = response.data;

          // Replace optimistic message with real message from backend
          if (realMessage && realMessage.id) {
            console.log("🔄 Replacing optimistic message with real message");
            replaceOptimisticMessage(
              queuedMsg.conversationId,
              queuedMsg.id,
              realMessage
            );
          } else {
            // Fallback: just update status
            updateMessageStatus(messageId, conversationId, "sent");
          }

          // Remove from queue
          removeFromQueue(messageId);

          toast.success("Message sent successfully");
        } else {
          throw new Error("Failed to send message");
        }
      } catch (error: any) {
        console.error("❌ Failed to send message:", error);

        // Update queue item with error
        updateQueueItem(messageId, {
          status: "failed",
          error: error.message || "Failed to send",
        });

        updateMessageStatus(messageId, conversationId, "failed");
        toast.error("Failed to send message. Please try again.");
      }
    },
    [
      retryMessage,
      updateMessageStatus,
      isOnline,
      removeFromQueue,
      updateQueueItem,
      replaceOptimisticMessage,
    ]
  );

  return { retry };
};
