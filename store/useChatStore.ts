// store/useChatStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isEphemeralRelayMessage } from "@/lib/ws/handlers/chat/utils";

interface MessagePaginationState {
  hasMore: boolean;
  oldestMessageId: string | null;
}

interface ChatStore {
  messages: Record<string, Message[]>;
  conversations: Record<string, Conversation>;
  members: Record<string, Member[]>;
  messagePagination: Record<string, MessagePaginationState>;
  typingUsers: Record<string, Record<string, string>>; // conversationId -> { userId: userName }
  _version: number; // Version counter to force updates
  addMessage: (conversationId: string, msg: Message) => void;
  addOrUpdateMessage: (conversationId: string, msg: Message) => void;
  setMessages: (conversationId: string, msgs: Message[]) => void;
  prependMessages: (conversationId: string, olderMsgs: Message[]) => void;
  setMessagePagination: (
    conversationId: string,
    pagination: MessagePaginationState,
  ) => void;
  setConversation: (conversationId: string, conversation: Conversation) => void;
  updateConversation: (
    conversationId: string,
    newDetails: Partial<Conversation>,
  ) => void;
  setMembers: (conversationId: string, members: Member[]) => void;
  setTypingStatus: (
    conversationId: string,
    userId: string,
    isTyping: boolean,
    userName?: string,
  ) => void;
  updateMessageStatus: (
    id: string,
    conversationId: string,
    status: "pending" | "sending" | "sent" | "failed",
  ) => void;
  updateMessageReadStatus: (
    id: string,
    conversationId: string,
    read_at: Date,
  ) => void;
  updateMessagesReadUpToMessage: (
    conversationId: string,
    senderIdToMark: string,
    upToMessageId: string,
    read_at: Date,
  ) => void;
  updateMessageContent: (
    conversationId: string,
    messageId: string,
    newContent: string,
  ) => void;
  replaceOptimisticMessage: (
    conversationId: string,
    optimisticId: string,
    realMessage: Message,
  ) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  updateMessageReaction: (
    conversationId: string,
    messageId: string,
    reaction: {
      userId: string;
      userName: string;
      userAvatar?: string;
      emoji: string;
      action: "added" | "removed";
    },
  ) => void;
  clearConversationData: (conversationId: string) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      messages: {},
      conversations: {},
      members: {},
      messagePagination: {},
      typingUsers: {},
      _version: 2,
      addMessage: (conversationId, msg) => {
        if (isEphemeralRelayMessage(msg)) return;
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
        if (isEphemeralRelayMessage(msg)) return;
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
            index === existingIndex ? { ...m, ...msg } : m,
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
        const visibleMsgs = msgs.filter((m) => !isEphemeralRelayMessage(m));
        set({
          messages: {
            ...get().messages,
            [conversationId]: visibleMsgs,
          },
        });
      },

      prependMessages: (conversationId, olderMsgs) => {
        const currentState = get();
        const existing = currentState.messages[conversationId] || [];
        const seen = new Set(existing.map((m) => m.id));
        const uniqueOlder = olderMsgs.filter(
          (m) => m.id && !seen.has(m.id) && !isEphemeralRelayMessage(m),
        );
        if (uniqueOlder.length === 0) return;

        const merged = [...uniqueOlder, ...existing].sort((a, b) => {
          const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
          return aTime - bTime;
        });

        set({
          messages: {
            ...currentState.messages,
            [conversationId]: merged,
          },
          _version: currentState._version + 1,
        });
      },

      setMessagePagination: (conversationId, pagination) => {
        set({
          messagePagination: {
            ...get().messagePagination,
            [conversationId]: pagination,
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

      setTypingStatus: (conversationId, userId, isTyping, userName) => {
        const currentTyping = get().typingUsers[conversationId] || {};
        
        if (isTyping) {
          // Add user to typing list
          set({
            typingUsers: {
              ...get().typingUsers,
              [conversationId]: {
                ...currentTyping,
                [userId]: userName || "Someone",
              },
            },
          });
        } else {
          // Remove user from typing list
          const newTyping = { ...currentTyping };
          delete newTyping[userId];
          
          set({
            typingUsers: {
              ...get().typingUsers,
              [conversationId]: newTyping,
            },
          });
        }
      },

      updateMessageStatus: (id, conversationId, status) => {
        const updated = (get().messages[conversationId] || []).map((m) =>
          m.id === id ? { ...m, status } : m,
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
          m.id === id ? { ...m, read_at } : m,
        );
        set({
          messages: {
            ...get().messages,
            [conversationId]: updated,
          },
        });
      },

      updateMessagesReadUpToMessage: (
        conversationId,
        senderIdToMark,
        upToMessageId,
        read_at,
      ) => {
        const convMsgs = get().messages[conversationId] || [];
        const upToMsg = convMsgs.find((m) => m.id === upToMessageId);
        const upToCreatedAt = upToMsg?.created_at ? new Date(upToMsg.created_at) : null;
        if (!upToCreatedAt || Number.isNaN(upToCreatedAt.getTime())) {
          const updated = convMsgs.map((m) =>
            m.id === upToMessageId ? { ...m, read_at } : m,
          );
          set({
            messages: {
              ...get().messages,
              [conversationId]: updated,
            },
          });
          return;
        }

        const updated = convMsgs.map((m) => {
          if (m.sender_id !== senderIdToMark) return m;
          const msgCreatedAt = m.created_at ? new Date(m.created_at) : null;
          if (!msgCreatedAt || Number.isNaN(msgCreatedAt.getTime())) return m;
          if (msgCreatedAt.getTime() > upToCreatedAt.getTime()) return m;
          if (m.read_at) return m;
          return { ...m, read_at };
        });

        set({
          messages: {
            ...get().messages,
            [conversationId]: updated,
          },
        });
      },

      updateMessageContent: (conversationId, messageId, newContent) => {
        const updated = (get().messages[conversationId] || []).map((m) =>
          m.id === messageId ? { ...m, content: newContent } : m,
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

        const mergedMessage = { ...realMessage, status: "sent" as const };

        // Remove optimistic bubble and any prior copy of the server message id.
        const updatedMessages = convMsgs
          .filter((m) => m.id !== optimisticId && m.id !== realMessage.id)
          .concat(mergedMessage)
          .sort(
            (a, b) =>
              new Date(a.created_at || 0).getTime() -
              new Date(b.created_at || 0).getTime(),
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

      updateMessageReaction: (conversationId, messageId, reaction) => {
        const currentState = get();
        const convMsgs = currentState.messages[conversationId] || [];
        const updatedMessages = convMsgs.map((msg) => {
          if (msg.id !== messageId) return msg;

          const currentReactions = msg.reactions || [];
          let nextReactions = [...currentReactions];

          if (reaction.action === "removed") {
            nextReactions = nextReactions.filter((r) => {
              const rId = r.userId || (r as any).user_id || r.user?.id;
              return rId !== reaction.userId;
            });
          } else {
            // Remove any existing reaction by this user to enforce 1 reaction per user
            nextReactions = nextReactions.filter((r) => {
              const rId = r.userId || (r as any).user_id || r.user?.id;
              return rId !== reaction.userId;
            });
            nextReactions.push({
              emoji: reaction.emoji,
              userId: reaction.userId,
              userName: reaction.userName,
              userAvatar: reaction.userAvatar,
            });
          }

          return { ...msg, reactions: nextReactions };
        });

        set({
          messages: {
            ...currentState.messages,
            [conversationId]: updatedMessages,
          },
          _version: currentState._version + 1,
        });
      },

      clearConversationData: (conversationId) => {
        const currentState = get();
        const { [conversationId]: _msgs, ...restMessages } =
          currentState.messages;
        const { [conversationId]: _members, ...restMembers } =
          currentState.members;
        const { [conversationId]: _conv, ...restConversations } =
          currentState.conversations;
        const { [conversationId]: _pagination, ...restPagination } =
          currentState.messagePagination;
        const { [conversationId]: _typing, ...restTyping } =
          currentState.typingUsers;

        set({
          messages: restMessages,
          members: restMembers,
          conversations: restConversations,
          messagePagination: restPagination,
          typingUsers: restTyping,
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
        messagePagination: state.messagePagination,
        _version: state._version,
      }),
      version: 2,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          return {
            ...persistedState,
            messagePagination: persistedState.messagePagination || {},
            typingUsers: persistedState.typingUsers || {},
            _version: 2,
          };
        }
        return persistedState as ChatStore;
      },
    },
  ),
);
