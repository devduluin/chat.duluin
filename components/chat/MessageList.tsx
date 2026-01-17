// components/chat/MessageList.tsx
"use client";

import { MessageBubble } from "./MessageBubble";
import { useMessages } from "@/hooks/useMessages";
import { useEffect, useRef, useCallback, useState } from "react";

export function MessageList({
  conversationId,
  onReply,
  userId,
  pinnedMessages = [],
  onPinChange,
  onScrollToMessageReady,
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
    []
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
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
