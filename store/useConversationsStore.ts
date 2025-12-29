import { createWithEqualityFn } from "zustand/traditional";
import { persist } from "zustand/middleware";
import { shallow } from "zustand/shallow";

interface ConversationsState {
  conversations: RecentConversation[];
  setConversation: (data: RecentConversation[]) => void;
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

      setMessage: (conversationId, newMessage, currentUserId) =>
        set((state) => ({
          conversations: state.conversations.map((item) => {
            if (item.Conversation.id === conversationId) {
              // Only increment unread count if message is from another user
              const isFromCurrentUser =
                currentUserId && newMessage.sender_id === currentUserId;
              const currentUnread =
                (item.Conversation as any).unread_count || 0;

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
          }),
        })),

      clearData: () => set(() => ({ conversations: [] })),
    }),
    {
      name: "conversations-storage",
    }
  ),
  shallow
);
