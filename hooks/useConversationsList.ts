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
      console.log("Full API response:", res);

      if (res && res.status) {
        console.log("Fetched conversations:", res.data);
        console.log(
          "Recent conversations with display_name:",
          res.data.recent_conversations
        );

        // Filter out duplicate AI Assistant conversations
        // We have a hardcoded AI Assistant entry in ConversationList.tsx
        // So we need to filter out any conversation named "AI Assistant" from API
        const AI_BOT_USER_ID = "1196e18b-c1dc-41aa-946a-0c55e9d64fe6";
        console.log(
          "🔍 FILTER START - Total conversations:",
          res.data.recent_conversations?.length
        );

        const filteredConversations =
          res.data.recent_conversations?.filter((conv: any) => {
            // Filter out ANY conversation named "AI Assistant"
            // because we have a hardcoded entry for it in ConversationList
            const isAIAssistant =
              conv.display_name === "AI Assistant" ||
              conv.Conversation?.name === "AI Assistant" ||
              conv.other_user_id === AI_BOT_USER_ID;

            if (isAIAssistant) {
              console.log("🤖 AI Assistant detected - FILTERING OUT:", {
                display_name: conv.display_name,
                conversation_id: conv.Conversation?.id,
                other_user_id: conv.other_user_id,
                reason: "Hardcoded entry exists in ConversationList",
              });
              return false; // Filter out - don't show in list
            }
            return true; // Keep all other conversations
          }) || [];

        console.log(
          "✅ FILTER COMPLETE - Filtered count:",
          filteredConversations.length,
          "from",
          res.data.recent_conversations?.length
        );
        setConversation(filteredConversations);
      } else {
        console.warn(
          "Invalid response format, keeping cached conversations:",
          res
        );
        // Don't clear conversations - keep existing data from localStorage
        console.log("📦 Using cached conversations from localStorage");
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      // Don't clear conversations on error - preserve offline data
      console.log(
        "📦 Backend offline - showing cached conversations from localStorage"
      );
      // Don't throw - let the app continue with cached data
    } finally {
      setLoadingOverlay(false);
    }
  }, [userId, filter, setLoadingOverlay, setConversation]); // Remove 'conversations' from deps to prevent loop

  return {
    conversations,
    fetchConversations,
    clearData,
    loadingOverlay,
    setMessage, // Expose this in case you want to manually update messages
  };
};
