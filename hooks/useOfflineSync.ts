// hooks/useOfflineSync.ts
import { useEffect, useCallback } from "react";
import { useOfflineQueueStore } from "@/store/useOfflineQueueStore";
import { useChatStore } from "@/store/useChatStore";
import { sendMessage as sendMessageAPI } from "@/services/v1/messageService";

const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 2000; // 2 seconds

export const useOfflineSync = () => {
  const {
    queue,
    isOnline,
    isSyncing,
    setSyncingStatus,
    updateQueueItem,
    removeFromQueue,
  } = useOfflineQueueStore();

  const { updateMessageStatus } = useChatStore();

  const syncMessage = useCallback(
    async (queuedMsg: any) => {
      try {
        console.log("📤 Syncing message:", queuedMsg.id);

        // Update status to sending
        updateQueueItem(queuedMsg.id, { status: "sending" });
        updateMessageStatus(queuedMsg.id, queuedMsg.conversationId, "sending");

        // Send to backend
        const response = await sendMessageAPI({
          conversation_id: queuedMsg.conversationId,
          sender_id: queuedMsg.senderId,
          tenant_id: queuedMsg.tenantId,
          content: queuedMsg.content,
          message_type: "text",
        });

        if (response && response.status) {
          console.log("✅ Message synced successfully:", queuedMsg.id);

          // Get real message from backend response
          const realMessage = response.data;

          // Replace optimistic message with real message from backend
          if (realMessage && realMessage.id) {
            console.log(
              "🔄 Replacing optimistic message with real message from backend",
            );
            useChatStore
              .getState()
              .replaceOptimisticMessage(
                queuedMsg.conversationId,
                queuedMsg.id,
                realMessage,
              );
          } else {
            // Fallback: just update status if no real message data
            updateMessageStatus(queuedMsg.id, queuedMsg.conversationId, "sent");
          }

          // Remove from queue
          removeFromQueue(queuedMsg.id);

          return { success: true, message: realMessage };
        } else {
          throw new Error("Failed to send message");
        }
      } catch (error: any) {
        console.error("❌ Failed to sync message:", queuedMsg.id, error);

        const newRetryCount = queuedMsg.retryCount + 1;

        if (newRetryCount >= MAX_RETRY_COUNT) {
          // Max retries reached
          updateQueueItem(queuedMsg.id, {
            status: "failed",
            retryCount: newRetryCount,
            error: error.message || "Max retries reached",
          });
          updateMessageStatus(queuedMsg.id, queuedMsg.conversationId, "failed");
        } else {
          // Queue for retry
          updateQueueItem(queuedMsg.id, {
            status: "pending",
            retryCount: newRetryCount,
            error: error.message,
          });
        }

        return { success: false, error };
      }
    },
    [updateQueueItem, updateMessageStatus, removeFromQueue],
  );

  const syncQueue = useCallback(async () => {
    if (!isOnline || isSyncing || queue.length === 0) {
      return;
    }

    console.log("🔄 Starting queue sync, messages:", queue.length);
    setSyncingStatus(true);

    const pendingMessages = queue.filter(
      (msg) => msg.status === "pending" || msg.status === "failed",
    );

    // Sync messages one by one to maintain order
    for (const msg of pendingMessages) {
      if (msg.retryCount < MAX_RETRY_COUNT) {
        await syncMessage(msg);
        // Small delay between messages
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setSyncingStatus(false);
    console.log("✅ Queue sync completed");
  }, [isOnline, isSyncing, queue, setSyncingStatus, syncMessage]);

  // Auto-sync via HTTP when coming back online (fallback for failed WebSocket)
  useEffect(() => {
    if (isOnline && queue.length > 0 && !isSyncing) {
      console.log(
        "🟢 Online - starting auto-sync via HTTP for queued messages",
      );
      const timer = setTimeout(() => {
        syncQueue();
      }, 1000); // Wait 1 second before syncing

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, queue.length, isSyncing]); // Don't include syncQueue to prevent loop

  return {
    syncQueue,
    isSyncing,
    pendingCount: queue.filter((m) => m.status === "pending").length,
    failedCount: queue.filter((m) => m.status === "failed").length,
  };
};
