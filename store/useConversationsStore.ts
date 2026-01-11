import { createWithEqualityFn } from "zustand/traditional";
import { persist } from "zustand/middleware";
import { shallow } from "zustand/shallow";

interface ConversationsState {
  conversations: RecentConversation[];
  setConversation: (data: RecentConversation[]) => void;
  addNewConversation: (conversation: RecentConversation) => void;
  updateConversation: (
    conversationId: string,
    newDetails: Partial<ConversationDetails>
  ) => void;
  setMessage: (
    conversationId: string,
    newMessage: Message,
    currentUserId?: string
  ) => void;
  clearData: () => void;
}

export const useConversationsStore = createWithEqualityFn<ConversationsState>()(
  persist(
    (set) => ({
      conversations: [],

      updateConversation: (conversationId, newDetails) =>
        set((state) => ({
          conversations: state.conversations.map((item) =>
            item.Conversation.id === conversationId
              ? {
                  ...item,
                  Conversation: { ...item.Conversation, ...newDetails },
                }
              : item
          ),
        })),

      setConversation: (data) =>
        set(() => {
          // Deduplicate conversations by ID
          const uniqueConversations = data.reduce(
            (acc: RecentConversation[], current: RecentConversation) => {
              const exists = acc.find(
                (item) => item.Conversation.id === current.Conversation.id
              );
              if (!exists) {
                // Preserve display_name, display_avatar, and unread_count from API
                acc.push({
                  ...current,
                  Conversation: {
                    ...current.Conversation,
                    display_name: (current as any).display_name,
                    display_avatar: (current as any).display_avatar,
                    unread_count: (current as any).unread_count || 0,
                  },
                });
              }
              return acc;
            },
            []
          );
          return { conversations: uniqueConversations };
        }),

      addNewConversation: (conversation) =>
        set((state) => {
          // Check if conversation already exists
          const exists = state.conversations.find(
            (item) => item.Conversation.id === conversation.Conversation.id
          );

          if (exists) {
            // If exists, just return current state
            return state;
          }

          // Add new conversation to the top of the list
          return {
            conversations: [conversation, ...state.conversations],
          };
        }),

      setMessage: (conversationId, newMessage, currentUserId) =>
        set((state) => {
          console.log("🔍 setMessage called:", {
            conversationId,
            newMessageContent: newMessage.content,
            currentUserId,
            senderId: newMessage.sender_id,
          });

          // Check if conversation exists
          const conversationExists = state.conversations.some(
            (item) => item.Conversation.id === conversationId
          );

          // If conversation doesn't exist, we can't add it here without full conversation data
          // The addNewConversation method should be called first
          if (!conversationExists) {
            console.warn(
              `Conversation ${conversationId} not found. Message will be queued until conversation is fetched.`
            );
            return state;
          }

          const updatedConversations = state.conversations.map((item) => {
            if (item.Conversation.id === conversationId) {
              // Only increment unread count if message is from another user
              const isFromCurrentUser =
                currentUserId && newMessage.sender_id === currentUserId;
              const currentUnread =
                (item.Conversation as any).unread_count || 0;

              console.log("✅ Updating conversation in store:", {
                conversationId,
                oldLastMessage: item.LastMessage?.content,
                newLastMessage: newMessage.content,
                isFromCurrentUser,
              });

              return {
                ...item,
                LastMessage: newMessage,
                Conversation: {
                  ...item.Conversation,
                  unread_count: isFromCurrentUser
                    ? currentUnread
                    : currentUnread + 1,
                } as any,
              };
            }
            return item;
          });

          return {
            conversations: updatedConversations,
          };
        }),

      clearData: () => set(() => ({ conversations: [] })),
    }),
    {
      name: "conversations-storage",
    }
  ),
  shallow
);
