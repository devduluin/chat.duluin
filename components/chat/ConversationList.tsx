// components/chat/ConversationList.tsx
"use client";
import { useEffect } from "react";
import { useConversations } from "@/hooks/useConversationsList";
import { ConversationItem } from "./ConversationItem";
import { useAccountStore } from "@/store/useAccountStore";

export function ConversationList({ userId }: { userId: string }) {
  // Get user ID from account store
  // const { data: account, setData } = useAccountStore();
  // const userId = "02a7eb2c-3c71-4c7f-8dc8-716ddbd3f24f";
  const {
    conversations: recent_conversations,
    loadingOverlay: loading,
    fetchConversations,
  } = useConversations(userId);

  // Fetch conversations on mount
  useEffect(() => {
    if (userId) fetchConversations();
  }, [userId, fetchConversations]);
  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-200 dark:bg-gray-700 rounded"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {[...recent_conversations]
        .sort((a, b) => {
          if (a.Conversation.name === "Personal Assistant AI") return -1;
          if (b.Conversation.name === "Personal Assistant AI") return 1;

          const dateA = new Date(a.LastMessage?.created_at ?? 0).getTime();
          const dateB = new Date(b.LastMessage?.created_at ?? 0).getTime();
          return dateB - dateA;
        })
        .map((item: RecentConversation) => {
          // Ensure display_name and display_avatar are accessible
          const conversationWithDisplay = {
            ...item.Conversation,
            display_name:
              (item as any).display_name || item.Conversation.display_name,
            display_avatar:
              (item as any).display_avatar || item.Conversation.display_avatar,
          };

          return (
            <ConversationItem
              key={item.Conversation.id}
              conversation={conversationWithDisplay}
              lastMessage={item.LastMessage}
            />
          );
        })}
    </div>
  );
}
