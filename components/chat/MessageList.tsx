// components/chat/MessageList.tsx
"use client";

import { MessageBubble } from "./MessageBubble";
import { isEphemeralRelayMessage } from "@/lib/ws/handlers/chat/utils";
import { useMessages } from "@/hooks/useMessages";
import { useEffect, useRef, useCallback, useState } from "react";
import { UserPlus, UserMinus, Info, Shield, ShieldOff } from "lucide-react";

import { useChatStore } from "@/store/useChatStore";

// System message alert component
function SystemMessageAlert({ content }: { content: string }) {
  // Parse system message content if it is in structured format
  let displayContent = content;
  let isMemberAdded = content.includes("was added to the group") || content.startsWith("member_added:");
  let isMemberRemoved =
    content.includes("was removed from the group") ||
    content.includes("You were removed from the group") ||
    content.startsWith("member_removed:") ||
    content.startsWith("member_exit:");

  let isPromoted = content.startsWith("member_promoted:");
  let isDemoted = content.startsWith("member_demoted:");

  if (content.startsWith("member_added:")) {
    const parts = content.split(":");
    const userName = parts[2] || "A member";
    displayContent = `${userName} was added to the group`;
  } else if (content.startsWith("member_removed:")) {
    const parts = content.split(":");
    const userName = parts[2] || "A member";
    displayContent = `${userName} was removed from the group`;
  } else if (content.startsWith("member_exit:")) {
    const parts = content.split(":");
    const userName = parts[2] || "A member";
    displayContent = `${userName} left the group`;
  } else if (content.startsWith("member_promoted:")) {
    const parts = content.split(":");
    const userName = parts[2] || "A member";
    displayContent = `${userName} was promoted to Admin`;
  } else if (content.startsWith("member_demoted:")) {
    const parts = content.split(":");
    const userName = parts[2] || "A member";
    displayContent = `${userName} was demoted to User`;
  } else if (content.startsWith("conversation_updated:")) {
    const text = content.replace("conversation_updated:", "");
    displayContent = `Conversation name ${text}`;
  }

  // Determine styling based on action type
  const bgColor = isMemberRemoved
    ? "bg-red-50 dark:bg-red-900/20"
    : (isMemberAdded || isPromoted)
      ? "bg-blue-50 dark:bg-blue-900/20"
      : isDemoted
        ? "bg-amber-50 dark:bg-amber-900/20"
        : "bg-gray-50 dark:bg-gray-900/20";
  const borderColor = isMemberRemoved
    ? "border-red-200 dark:border-red-800"
    : (isMemberAdded || isPromoted)
      ? "border-blue-200 dark:border-blue-800"
      : isDemoted
        ? "border-amber-200 dark:border-amber-800"
        : "border-gray-200 dark:border-gray-800";
  const iconColor = isMemberRemoved
    ? "text-red-600 dark:text-red-400"
    : (isMemberAdded || isPromoted)
      ? "text-blue-600 dark:text-blue-400"
      : isDemoted
        ? "text-amber-600 dark:text-amber-400"
        : "text-gray-600 dark:text-gray-400";
  const textColor = isMemberRemoved
    ? "text-red-700 dark:text-red-300"
    : (isMemberAdded || isPromoted)
      ? "text-blue-700 dark:text-blue-300"
      : isDemoted
        ? "text-amber-700 dark:text-amber-300"
        : "text-gray-700 dark:text-gray-300";

  return (
    <div className="flex items-center justify-center my-2">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-full ${bgColor} border ${borderColor}`}
      >
        {isMemberAdded && <UserPlus className={`h-4 w-4 ${iconColor}`} />}
        {isMemberRemoved && <UserMinus className={`h-4 w-4 ${iconColor}`} />}
        {isPromoted && <Shield className={`h-4 w-4 ${iconColor}`} />}
        {isDemoted && <ShieldOff className={`h-4 w-4 ${iconColor}`} />}
        {!isMemberAdded && !isMemberRemoved && !isPromoted && !isDemoted && (
          <Info className={`h-4 w-4 ${iconColor}`} />
        )}
        <span className={`text-sm ${textColor}`}>{displayContent}</span>
      </div>
    </div>
  );
}

export function MessageList({
  conversationId,
  onReply,
  userId,
  pinnedMessages = [],
  onPinChange,
  onScrollToMessageReady,
  isGroupConversation = false,
}: {
  conversationId: string;
  onReply?: (message: {
    id: string;
    content: string;
    sender: { first_name: string; last_name: string };
  }) => void;
  userId: string;
  pinnedMessages?: any[];
  onPinChange?: () => void;
  onScrollToMessageReady?: (fn: (messageId: string) => void) => void;
  isGroupConversation?: boolean;
}) {
  const {
    messages,
    loading,
    loadingOlder,
    hasMore,
    loadOlderMessages,
  } = useMessages(conversationId, userId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isClient, setIsClient] = useState(false);

  // Ensure rendering only on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    lastMessageIdRef.current = null;
  }, [conversationId]);

  const scrollToMessage = useCallback((id: string) => {
    const ref = messageRefs.current.get(id);
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "center" });
      ref.classList.add("ring-2", "ring-blue-500", "bg-blue-500/10");
      setTimeout(() => {
        ref.classList.remove("ring-2", "ring-blue-500", "bg-blue-500/10");
      }, 2000);
    }
  }, []);

  // Expose scrollToMessage to parent component
  useEffect(() => {
    if (onScrollToMessageReady) {
      onScrollToMessageReady(scrollToMessage);
    }
  }, [scrollToMessage, onScrollToMessageReady]);

  const setMessageRef = useCallback(
    (id: string, ref: HTMLDivElement | null) => {
      if (ref) {
        messageRefs.current.set(id, ref);
      }
    },
    [],
  );

  const handleLoadOlder = useCallback(async () => {
    const container = scrollContainerRef.current;
    if (!container) {
      await loadOlderMessages();
      return;
    }

    const previousScrollHeight = container.scrollHeight;
    const previousScrollTop = container.scrollTop;

    await loadOlderMessages();

    requestAnimationFrame(() => {
      const nextContainer = scrollContainerRef.current;
      if (!nextContainer) return;
      nextContainer.scrollTop =
        nextContainer.scrollHeight - previousScrollHeight + previousScrollTop;
    });
  }, [loadOlderMessages]);

  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;
    const threshold = 120;
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold
    );
  }, []);

  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const lastId = lastMessage?.id ?? null;
    const prevLastId = lastMessageIdRef.current;

    if (!lastId) return;

    const isInitialLoad = prevLastId === null;
    const isNewMessageAtBottom = lastId !== prevLastId && isNearBottom();

    if (isInitialLoad || isNewMessageAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    lastMessageIdRef.current = lastId;
  }, [messages, isNearBottom]);

  // Create a stable reference for messages map
  const messagesMap = useRef(new Map<string, Message>());
  useEffect(() => {
    messagesMap.current = new Map(messages.map((msg) => [msg.id ?? "", msg]));
  }, [messages]);

  if (!isClient) {
    // Render nothing or a fallback during SSR
    return null;
  }

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`h-16 bg-gray-200 dark:bg-gray-700 rounded ${
                i % 2 ? "ml-16" : "mr-16"
              }`}
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 p-4 overflow-y-auto">
      <div className="space-y-4">
        {hasMore && (
          <div className="flex justify-center py-2">
            <button
              type="button"
              onClick={handleLoadOlder}
              disabled={loadingOlder}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {loadingOlder ? "Memuat..." : "Muat chat lainnya"}
            </button>
          </div>
        )}
        {(() => {
          const uniqueMessages: Message[] = [];
          const seenIds = new Set<string>();
          messages.forEach((msg) => {
            if (msg && msg.id && !seenIds.has(msg.id) && !isEphemeralRelayMessage(msg)) {
              seenIds.add(msg.id);
              uniqueMessages.push(msg);
            }
          });
          return uniqueMessages;
        })().map((message) => {
          // Check if it's a system message for member added/removed
          const isSystemMessage =
            message.message_type === "system" ||
            (message as any).MessageType === "system" ||
            message.content?.startsWith("member_added:") ||
            message.content?.startsWith("member_removed:") ||
            message.content?.startsWith("member_exit:") ||
            message.content?.startsWith("member_promoted:") ||
            message.content?.startsWith("member_demoted:") ||
            message.content?.startsWith("conversation_updated:");
          if (isSystemMessage) {
            return (
              <SystemMessageAlert
                key={message.id}
                content={message.content || ""}
              />
            );
          }

          // Regular message rendering
          const parentMessage = message.parent_message_id
            ? messagesMap.current.get(message.parent_message_id)
            : null;

          const isPinned = pinnedMessages.some((pin) => pin.id === message.id);

          return (
            <MessageBubble
              key={message.id}
              ref={(ref) => setMessageRef(message.id ?? "", ref)}
              userId={userId}
              message={message}
              onReply={onReply}
              parentMessage={parentMessage}
              scrollToMessage={scrollToMessage}
              isPinnedMessage={isPinned}
              onPinChange={onPinChange}
              isGroupConversation={isGroupConversation}
            />
          );
        })}

      <div ref={messagesEndRef} />
    </div>
    </div>
  );
}
