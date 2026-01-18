// store/useChatStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChatStore {
  messages: Record<string, Message[]>;
  conversations: Record<string, Conversation>;
  members: Record<string, Member[]>;
  _version: number; // Version counter to force updates
  addMessage: (conversationId: string, msg: Message) => void;
  addOrUpdateMessage: (conversationId: string, msg: Message) => void;
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
  replaceOptimisticMessage: (
    conversationId: string,
    optimisticId: string,
    realMessage: Message
  ) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      messages: {},
      conversations: {},
      members: {},
      _version: 0,
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

      addOrUpdateMessage: (conversationId, msg) => {
        const currentState = get();
        const convMsgs = currentState.messages[conversationId] || [];

        console.log("🔄 addOrUpdateMessage called:", {
          conversationId,
          messageId: msg.id,
          content: msg.content,
          existingMessagesCount: convMsgs.length,
        });

        // Check if message already exists
        const existingIndex = convMsgs.findIndex((m) => m.id === msg.id);

        console.log("🔍 Message lookup result:", {
          messageId: msg.id,
          existingIndex,
          exists: existingIndex !== -1,
        });

        if (existingIndex !== -1) {
          // Message exists - update it
          console.log("📝 Updating existing message:", {
            messageId: msg.id,
            oldContent: convMsgs[existingIndex].content,
            newContent: msg.content,
          });

          // Create a completely new array with updated message
          const updatedMessages = convMsgs.map((m, index) =>
            index === existingIndex ? { ...m, ...msg } : m
          );

          console.log("✅ Message updated, setting new state");

          // Force a new reference for the entire messages object AND increment version
          set({
            messages: {
              ...currentState.messages,
              [conversationId]: updatedMessages,
            },
            _version: currentState._version + 1,
          });

          console.log(
            "✅ State updated with version:",
            currentState._version + 1
          );
        } else {
          // Message doesn't exist - add it
          console.log("➕ Adding new message:", msg.id);
          set({
            messages: {
              ...currentState.messages,
              [conversationId]: [...convMsgs, msg],
            },
            _version: currentState._version + 1,
          });
        }
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

      replaceOptimisticMessage: (conversationId, optimisticId, realMessage) => {
        const currentState = get();
        const convMsgs = currentState.messages[conversationId] || [];

        console.log("🔄 Replacing optimistic message:", {
          optimisticId,
          realMessageId: realMessage.id,
          conversationId,
        });

        // Remove optimistic message and add real message, then sort by timestamp
        const updatedMessages = convMsgs
          .filter((m) => m.id !== optimisticId)
          .concat({ ...realMessage, status: "sent" })
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          );

        set({
          messages: {
            ...currentState.messages,
            [conversationId]: updatedMessages,
          },
          _version: currentState._version + 1,
        });
      },

      removeMessage: (conversationId, messageId) => {
        const currentState = get();
        const convMsgs = currentState.messages[conversationId] || [];

        console.log("🗑️ Removing message:", {
          conversationId,
          messageId,
          beforeCount: convMsgs.length,
        });

        const updatedMessages = convMsgs.filter((m) => m.id !== messageId);

        console.log("🗑️ After remove:", {
          afterCount: updatedMessages.length,
        });

        set({
          messages: {
            ...currentState.messages,
            [conversationId]: updatedMessages,
          },
          _version: currentState._version + 1,
        });
      },
    }),
    {
      name: "chat-storage",
      partialize: (state) => ({
        messages: state.messages,
        conversations: state.conversations,
        members: state.members,
        _version: state._version,
      }),
    }
  )
);
