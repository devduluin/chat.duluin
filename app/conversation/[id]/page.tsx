// app/conversation/[id]/page.tsx
"use client";
import { useParams } from "next/navigation";
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

export default function ConversationPage() {
  const params = useParams();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: account } = useAccountStore();
  const userId = account?.id || "";
  const { updateConversation } = useConversationsStore();

  // Initialize WebSocket for real-time messaging
  const { sendMessage } = useMessageSocket(conversationId as string, userId);

  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    sender: { first_name: string; last_name: string };
  } | null>(null);

  // Mark conversation as read when opened
  useEffect(() => {
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
  }, [conversationId, userId, updateConversation]);

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
