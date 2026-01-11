// app/conversation/[id]/page.tsx
"use client";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { EmptyState } from "@/components/ui/emptyState";
import { useState, useEffect } from "react";
import { useMessageSocket } from "@/hooks/useMessageSocket";
import { useAccountStore } from "@/store/useAccountStore";
import { markConversationAsRead } from "@/services/v1/readService";
import { useConversationsStore } from "@/store/useConversationsStore";
import Cookies from "js-cookie";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: account } = useAccountStore();
  const { updateConversation } = useConversationsStore();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Get userId from account store or fallback to cookies
  const userIdFromCookies =
    typeof window !== "undefined" ? Cookies.get("user_id") || "" : "";
  const userId = userIdFromCookies;

  console.log("🔍 ConversationPage - userId:", {
    fromAccount: account?.id,
    fromCookies: userIdFromCookies,
    finalUserId: userId,
  });

  // Wait for account store to load (middleware already handles auth redirect)
  useEffect(() => {
    // Give time for account store to hydrate from localStorage
    const timer = setTimeout(() => {
      setIsAuthChecking(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Initialize WebSocket for real-time messaging (only after auth check and userId available)
  const { sendMessage } = useMessageSocket(
    conversationId as string,
    userId // Use userId with fallback
  );

  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    sender: { first_name: string; last_name: string };
  } | null>(null);

  // Mark conversation as read when opened (only if authenticated and has userId)
  useEffect(() => {
    if (isAuthChecking) return; // Don't call API until auth is checked

    if (conversationId && userId) {
      markConversationAsRead(conversationId, userId)
        .then(() => {
          // Update local store to reset unread count
          updateConversation(conversationId, { unread_count: 0 } as any);
        })
        .catch((error) => {
          console.error("Failed to mark as read:", error);
        });
    }
  }, [conversationId, userId, updateConversation, isAuthChecking]);

  // Show loading while checking auth
  if (isAuthChecking) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col h-screen">
        <EmptyState
          title="No conversation selected"
          description="Please select a conversation to start chatting"
          icon="chat"
        />
      </div>
    );
  }

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen">
        <ChatHeader conversationId={conversationId} userId={userId} />
        <MessageList
          conversationId={conversationId}
          onReply={setReplyingTo}
          userId={userId}
        />
        <MessageInput
          conversationId={conversationId}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          userId={userId}
          sendMessage={sendMessage}
        />
      </div>
    </>
  );
}
