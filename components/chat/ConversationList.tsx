// components/chat/ConversationList.tsx
"use client";
import { useEffect } from "react";
import { useConversations } from "@/hooks/useConversationsList";
import { ConversationItem } from "./ConversationItem";
import { useAccountStore } from "@/store/useAccountStore";
import { useOfflineQueueStore } from "@/store/useOfflineQueueStore";
import Link from "next/link";
import { Avatar } from "../ui/avatar";
import { Bot, WifiOff } from "lucide-react";

export function ConversationList({ userId }: { userId: string }) {
  // Get user ID from account store
  // const { data: account, setData } = useAccountStore();
  // const userId = "02a7eb2c-3c71-4c7f-8dc8-716ddbd3f24f";
  const {
    conversations: recent_conversations,
    loadingOverlay: loading,
    fetchConversations,
  } = useConversations(userId);

  const isOnline = useOfflineQueueStore((state) => state.isOnline);

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
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b-2 border-yellow-200 dark:border-yellow-800 p-3">
          <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">
              You're offline - showing cached data
            </span>
          </div>
        </div>
      )}

      {/* AI Chatbot Entry */}
      <Link
        href="/conversation/ai-chatbot"
        className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b-2 border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate flex items-center gap-2">
                AI Assistant
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                  Bot
                </span>
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
              Tanya apa saja kepada asisten AI
            </p>
          </div>
        </div>
      </Link>

      {/* Regular Conversations */}
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
              (item as any).display_name ||
              (item.Conversation as any).display_name,
            display_avatar:
              (item as any).display_avatar ||
              (item.Conversation as any).display_avatar,
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
