// hooks/usePinnedMessages.ts
import { useState, useEffect, useCallback } from "react";
import { getPinnedMessages } from "@/services/v1/messageService";

export const usePinnedMessages = (conversationId: string) => {
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPinnedMessages = useCallback(async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      const response = await getPinnedMessages(conversationId);

      if (response?.status && response?.data) {
        setPinnedMessages(response.data);
      } else {
        setPinnedMessages([]);
      }
    } catch (error) {
      console.error("Failed to fetch pinned messages:", error);
      setPinnedMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchPinnedMessages();
  }, [fetchPinnedMessages]);

  const refreshPinnedMessages = () => {
    fetchPinnedMessages();
  };

  return {
    pinnedMessages,
    loading,
    refreshPinnedMessages,
  };
};
