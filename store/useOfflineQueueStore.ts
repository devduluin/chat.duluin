// store/useOfflineQueueStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface QueuedMessage {
  id: string; // Temporary ID untuk UI
  conversationId: string;
  content: string;
  senderId: string;
  tenantId: string;
  createdAt: Date;
  status: "pending" | "sending" | "failed" | "sent";
  retryCount: number;
  error?: string;
}

interface OfflineQueueStore {
  queue: QueuedMessage[];
  isOnline: boolean;
  isSyncing: boolean;

  // Queue management
  addToQueue: (message: Omit<QueuedMessage, "status" | "retryCount">) => void;
  removeFromQueue: (messageId: string) => void;
  updateQueueItem: (messageId: string, updates: Partial<QueuedMessage>) => void;
  clearQueue: () => void;
  retryMessage: (messageId: string) => void;

  // Network status
  setOnlineStatus: (online: boolean) => void;
  setSyncingStatus: (syncing: boolean) => void;

  // Get pending messages for a conversation
  getPendingMessages: (conversationId: string) => QueuedMessage[];
}

export const useOfflineQueueStore = create<OfflineQueueStore>()(
  persist(
    (set, get) => ({
      queue: [],
      isOnline: true,
      isSyncing: false,

      addToQueue: (message) => {
        const queuedMessage: QueuedMessage = {
          ...message,
          status: "pending",
          retryCount: 0,
        };

        set((state) => ({
          queue: [...state.queue, queuedMessage],
        }));

        console.log("📥 Message added to offline queue:", queuedMessage.id);
      },

      removeFromQueue: (messageId) => {
        set((state) => ({
          queue: state.queue.filter((msg) => msg.id !== messageId),
        }));
        console.log("✅ Message removed from queue:", messageId);
      },

      updateQueueItem: (messageId, updates) => {
        set((state) => ({
          queue: state.queue.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          ),
        }));
      },

      clearQueue: () => {
        set({ queue: [] });
        console.log("🗑️ Queue cleared");
      },

      retryMessage: (messageId) => {
        set((state) => ({
          queue: state.queue.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  status: "pending" as const,
                  retryCount: 0,
                  error: undefined,
                }
              : msg
          ),
        }));
        console.log("🔄 Retrying message:", messageId);
      },

      setOnlineStatus: (online) => {
        // Only update if status actually changed
        const currentOnline = get().isOnline;
        if (currentOnline !== online) {
          set({ isOnline: online });
          console.log(online ? "🟢 Online" : "🔴 Offline");
        }
      },

      setSyncingStatus: (syncing) => {
        // Only update if status actually changed
        const currentSyncing = get().isSyncing;
        if (currentSyncing !== syncing) {
          set({ isSyncing: syncing });
        }
      },

      getPendingMessages: (conversationId) => {
        return get().queue.filter(
          (msg) =>
            msg.conversationId === conversationId &&
            (msg.status === "pending" || msg.status === "failed")
        );
      },
    }),
    {
      name: "offline-queue-storage",
      partialize: (state) => ({
        queue: state.queue,
      }),
    }
  )
);
