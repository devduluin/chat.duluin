import { useCallback } from "react";
import { getConversations } from "@services/v1/conversationService";
import { useLoadingOverlayStore } from "@/store/useLoadingOverlayStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { shallow } from "zustand/shallow";

export const useConversations = (userId: string, filter?: any) => {
  const { conversations, setConversation, setMessage, clearData } =
    useConversationsStore(
      (state: any) => ({
        conversations: state.conversations,
        setConversation: state.setConversation,
        setMessage: state.setMessage,
        clearData: state.clearData,
      }),
      shallow
    );

  const { loadingOverlay, setLoadingOverlay } = useLoadingOverlayStore();

  const fetchConversations = useCallback(async () => {
    if (!userId) return;

    setLoadingOverlay(true);
    try {
      const res = await getConversations(userId, filter);
      if (res.status) {
        console.log("Fetched conversations:", res.data);
        console.log(
          "Recent conversations with display_name:",
          res.data.recent_conversations
        );
        setConversation(res.data.recent_conversations || []);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      throw err;
    } finally {
      setLoadingOverlay(false);
    }
  }, [userId, filter, setLoadingOverlay, setConversation]);

  return {
    conversations,
    fetchConversations,
    clearData,
    loadingOverlay,
    setMessage, // Expose this in case you want to manually update messages
  };
};
