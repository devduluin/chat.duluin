import { createWithEqualityFn } from "zustand/traditional";
import { persist } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

interface ConversationsState {
  conversations: RecentConversation[];
  setConversation: (data: RecentConversation[]) => void;
  updateConversation: (conversationId: string, newDetails: Partial<ConversationDetails>) => void;
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
              ? { ...item, Conversation: { ...item.Conversation, ...newDetails } }
              : item
          ),
        })),

      setConversation: (data) => set(() => ({ conversations: data })),

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
      name: 'conversations-storage',
    }
  ),
  shallow
);
