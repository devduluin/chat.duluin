// components/chat/MessageList.tsx
"use client";

import { MessageBubble } from "./MessageBubble";
import { useMessages } from "@/hooks/useMessages";
import { useEffect, useRef, useCallback, useState } from "react";
import { UserPlus, UserMinus, Info } from "lucide-react";

// System message alert component
function SystemMessageAlert({ content }: { content: string }) {
  // Check if it's a member added/removed message
  const isMemberAdded = content.includes("was added to the group");
  const isMemberRemoved =
    content.includes("was removed from the group") ||
    content.includes("You were removed from the group");

  if (!isMemberAdded && !isMemberRemoved) {
    // For other system messages, render normally
    return null;
  }

  // Determine styling based on action type
  const bgColor = isMemberRemoved
    ? "bg-red-50 dark:bg-red-900/20"
    : "bg-blue-50 dark:bg-blue-900/20";
  const borderColor = isMemberRemoved
    ? "border-red-200 dark:border-red-800"
    : "border-blue-200 dark:border-blue-800";
  const iconColor = isMemberRemoved
    ? "text-red-600 dark:text-red-400"
    : "text-blue-600 dark:text-blue-400";
  const textColor = isMemberRemoved
    ? "text-red-700 dark:text-red-300"
    : "text-blue-700 dark:text-blue-300";

  return (
    <div className="flex items-center justify-center my-2">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-full ${bgColor} border ${borderColor}`}
      >
        {isMemberAdded && <UserPlus className={`h-4 w-4 ${iconColor}`} />}
        {isMemberRemoved && <UserMinus className={`h-4 w-4 ${iconColor}`} />}
        <span className={`text-sm ${textColor}`}>{content}</span>
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
  const { messages, loading } = useMessages(conversationId, userId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [isClient, setIsClient] = useState(false);

  // Ensure rendering only on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create a stable reference for messages map
  const messagesMap = useRef(new Map<string, Message>());
  useEffect(() => {
    messagesMap.current = new Map(messages.map((msg) => [msg.id ?? "", msg]));
  }, [messages]);

  if (!isClient) {
    // Render nothing or a fallback during SSR
    return null;
  }

  if (loading) {
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
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="space-y-4">
        {messages.map((message) => {
          // Check if it's a system message for member added/removed
          const isSystemMessage =
            message.message_type === "system" ||
            (message as any).MessageType === "system";
          const isMemberChangeMessage =
            isSystemMessage &&
            (message.content?.includes("was added to the group") ||
              message.content?.includes("was removed from the group") ||
              message.content?.includes("You were removed from the group"));

          // Render as alert box for member changes
          if (isMemberChangeMessage) {
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
