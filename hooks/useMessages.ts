// hooks/useMessages.ts
import { useCallback, useEffect, useState } from "react";
import { useChatStore } from "@/store/useChatStore";
import { processIncomingE2EEMessage } from "@/lib/e2ee/message-crypto";
import { ensureDeviceRegistered } from "@/lib/e2ee/device-manager";
import {
  getSentPlaintext,
  isEncryptedPlaceholder,
} from "@/lib/e2ee/sent-plaintext-cache";
import {
  dedupeMessagesById,
  removeStaleOptimisticE2EEMessages,
} from "@/lib/e2ee/message-dedup";
import {
  getConversationById,
  getConversationMessages,
} from "@/services/v1/conversationService";

const EMPTY_ARRAY: Message[] = [];
const MESSAGE_PAGE_SIZE = 100;

async function decryptMessages(
  apiMessages: Message[],
  conversationId: string,
  userId: string,
): Promise<Message[]> {
  const existingMessages =
    useChatStore.getState().messages[conversationId] || [];

  return dedupeMessagesById(
    await Promise.all(
      apiMessages.map((msg) => {
        const existingMsg = existingMessages.find((m) => m.id === msg.id);
        const isSelf = msg.sender_id === userId;
        return processIncomingE2EEMessage(msg, userId, {
          senderPlaintext: isSelf ? existingMsg?.content : undefined,
          existingPlaintext: !isSelf ? existingMsg?.content : undefined,
        });
      }),
    ),
  );
}

function parsePagination(data: any) {
  const pagination = data?.message_pagination;
  return {
    hasMore: Boolean(pagination?.has_more),
    oldestMessageId: pagination?.oldest_message_id ?? null,
  };
}

export function useMessages(conversationId: string, userId: string) {
  const messages =
    useChatStore((state) => state.messages[conversationId]) || EMPTY_ARRAY;
  const conversations = useChatStore(
    (state) => state.conversations[conversationId],
  );
  const pagination = useChatStore(
    (state) => state.messagePagination[conversationId],
  );

  const setMessages = useChatStore.getState().setMessages;
  const prependMessages = useChatStore.getState().prependMessages;
  const setMessagePagination = useChatStore.getState().setMessagePagination;
  const setConversation = useChatStore.getState().setConversation;
  const setMembers = useChatStore.getState().setMembers;
  const updateMessageReadStatus =
    useChatStore.getState().updateMessageReadStatus;

  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const hasMore = pagination?.hasMore ?? false;

  useEffect(() => {
    if (!conversationId || !userId) return;

    const msgs = useChatStore.getState().messages[conversationId] || [];
    let changed = false;
    const updated = msgs.map((msg) => {
      if (msg.message_type !== "e2ee_text" || msg.sender_id !== userId) {
        return msg;
      }
      if (!isEncryptedPlaceholder(msg.content)) {
        return msg;
      }
      const cached = getSentPlaintext(msg.id);
      if (!cached) {
        return msg;
      }
      changed = true;
      return { ...msg, content: cached };
    });

    const cleaned = dedupeMessagesById(
      removeStaleOptimisticE2EEMessages(updated, userId),
    );

    if (changed || cleaned.length !== msgs.length) {
      setMessages(conversationId, cleaned);
    }
  }, [conversationId, userId, setMessages]);

  useEffect(() => {
    if (hasFetched) return;

    const fetchMessages = async () => {
      const userIdFromCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("user_id="))
        ?.split("=")[1];

      const finalUserId = userId || userIdFromCookie;

      if (!finalUserId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        await ensureDeviceRegistered(finalUserId);

        const json = await getConversationById(conversationId, finalUserId, {
          limit: MESSAGE_PAGE_SIZE,
        });

        if (!json?.status) {
          console.warn("Invalid conversation response:", json);
          return;
        }

        const apiMessages = json?.data?.Messages as Message[];
        const apiConversation = json?.data?.Conversation as Conversation;
        const apiMembers = json?.data?.Members as Member[];
        const displayName = json?.data?.display_name;
        const displayAvatar = json?.data?.display_avatar;
        const isUserMember = json?.data?.is_user_member;

        if (
          Array.isArray(apiMessages) &&
          apiMessages.every((msg) => typeof msg.id === "string")
        ) {
          const decryptedMessages = await decryptMessages(
            apiMessages,
            conversationId,
            finalUserId,
          );

          setMessages(conversationId, decryptedMessages);
          setMessagePagination(conversationId, parsePagination(json.data));
          setConversation(conversationId, {
            ...apiConversation,
            display_name: displayName,
            display_avatar: displayAvatar,
            is_user_member: isUserMember,
          } as Conversation);
          setMembers(conversationId, apiMembers);

          decryptedMessages.forEach((msg) => {
            if (msg.sender_id !== finalUserId && !msg.read_at && msg.id) {
              updateMessageReadStatus(msg.id, conversationId, new Date());
            }
          });
        } else {
          console.warn("Invalid message format:", apiMessages);
        }
      } catch (e) {
        console.error("Fetch error:", e);
      } finally {
        setLoading(false);
        const userIdFromCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("user_id="))
          ?.split("=")[1];
        if (userId || userIdFromCookie) {
          setHasFetched(true);
        }
      }
    };

    fetchMessages();
  }, [
    conversationId,
    userId,
    hasFetched,
    setConversation,
    setMembers,
    setMessagePagination,
    setMessages,
    updateMessageReadStatus,
  ]);

  useEffect(() => {
    setHasFetched(false);
  }, [conversationId, userId]);

  const loadOlderMessages = useCallback(async () => {
    const userIdFromCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("user_id="))
      ?.split("=")[1];
    const finalUserId = userId || userIdFromCookie;
    const oldestMessageId =
      useChatStore.getState().messagePagination[conversationId]
        ?.oldestMessageId;

    if (!finalUserId || !oldestMessageId || loadingOlder || !hasMore) {
      return;
    }

    setLoadingOlder(true);

    try {
      const json = await getConversationMessages(conversationId, finalUserId, {
        beforeId: oldestMessageId,
        limit: MESSAGE_PAGE_SIZE,
      });

      if (!json?.status) {
        console.warn("Failed to load older messages:", json);
        return;
      }

      const apiMessages = json?.data?.Messages as Message[];
      if (
        !Array.isArray(apiMessages) ||
        !apiMessages.every((msg) => typeof msg.id === "string")
      ) {
        console.warn("Invalid older messages format:", apiMessages);
        return;
      }

      const decryptedMessages = await decryptMessages(
        apiMessages,
        conversationId,
        finalUserId,
      );

      prependMessages(conversationId, decryptedMessages);
      setMessagePagination(conversationId, parsePagination(json.data));
    } catch (e) {
      console.error("Load older messages error:", e);
    } finally {
      setLoadingOlder(false);
    }
  }, [
    conversationId,
    userId,
    loadingOlder,
    hasMore,
    prependMessages,
    setMessagePagination,
  ]);

  return {
    conversations,
    messages,
    loading,
    loadingOlder,
    hasMore,
    loadOlderMessages,
  };
}
