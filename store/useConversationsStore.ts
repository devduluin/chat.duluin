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
  setMessage: (conversationId: string, newMessage: Message) => void;
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
                acc.push(current);
              }
              return acc;
            },
            []
          );
          return { conversations: uniqueConversations };
        }),

      setMessage: (conversationId, newMessage) =>
        set((state) => ({
          conversations: state.conversations.map((item) =>
            item.Conversation.id === conversationId
              ? { ...item, LastMessage: newMessage }
              : item
          ),
        })),

      clearData: () => set(() => ({ conversations: [] })),
    }),
    {
      name: "conversations-storage",
    }
  ),
  shallow
);
