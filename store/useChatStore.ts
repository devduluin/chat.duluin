// store/useChatStore.ts
import { createWithEqualityFn } from "zustand/traditional";
import { persist } from "zustand/middleware";
import { shallow } from "zustand/shallow";

interface ChatStore {
  messages: Record<string, Message[]>;
  conversations: Record<string, Conversation>;
  members: Record<string, Member[]>;
  addMessage: (conversationId: string, msg: Message) => void;
  setMessages: (conversationId: string, msgs: Message[]) => void;
  setConversation: (conversationId: string, conversation: Conversation) => void;
  updateConversation: (
    conversationId: string,
    newDetails: Partial<Conversation>
  ) => void;
  setMembers: (conversationId: string, members: Member[]) => void;
  updateMessageStatus: (
    id: string,
    conversationId: string,
    status: string
  ) => void;
  updateMessageReadStatus: (
    id: string,
    conversationId: string,
    read_at: Date
  ) => void;
  updateMessageContent: (
    conversationId: string,
    messageId: string,
    newContent: string
  ) => void;
}

export const useChatStore = createWithEqualityFn<ChatStore>()(
  persist(
    (set, get) => ({
      messages: {},
      conversations: {},
      members: {},
      addMessage: (conversationId, msg) => {
        const convMsgs = get().messages[conversationId] || [];

        // Check if message already exists by ID to prevent duplicates
        const messageExists = convMsgs.some((m) => m.id === msg.id);
        if (messageExists) {
          console.log("Message already exists, skipping:", msg.id);
          return;
        }

        set({
          messages: {
            ...get().messages,
            [conversationId]: [...convMsgs, msg],
          },
        });
      },

      setMessages: (conversationId, msgs) => {
        set({
          messages: {
            ...get().messages,
            [conversationId]: msgs,
          },
        });
      },

      setConversation: (conversationId, conversation: Conversation) => {
        set({
          conversations: {
            ...get().conversations,
            [conversationId]: conversation,
          },
        });
      },

      updateConversation: (conversationId, newDetails) => {
        set((state) => ({
          conversations: {
            ...state.conversations,
            [conversationId]: {
              ...state.conversations[conversationId],
              ...newDetails,
            },
          },
        }));
      },

      setMembers: (conversationId, members) => {
        set({
          members: {
            ...get().members,
            [conversationId]: members,
          },
        });
      },

      updateMessageStatus: (id, conversationId, status) => {
        const updated = (get().messages[conversationId] || []).map((m) =>
          m.id === id ? { ...m, status } : m
        );
        set({
          messages: {
            ...get().messages,
            [conversationId]: updated,
          },
        });
      },

      updateMessageReadStatus: (id, conversationId, read_at) => {
        const updated = (get().messages[conversationId] || []).map((m) =>
          m.id === id ? { ...m, read_at } : m
        );
        set({
          messages: {
            ...get().messages,
            [conversationId]: updated,
          },
        });
      },

      updateMessageContent: (conversationId, messageId, newContent) => {
        const updated = (get().messages[conversationId] || []).map((m) =>
          m.id === messageId ? { ...m, content: newContent } : m
        );
        set({
          messages: {
            ...get().messages,
            [conversationId]: updated,
          },
        });
      },
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({
        messages: state.messages,
        conversations: state.conversations, // Persist conversations as well
        members: state.members, // Persist members
      }), // Persist only messages
    }
  ),
  shallow
);
