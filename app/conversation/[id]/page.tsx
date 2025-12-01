// app/conversation/[id]/page.tsx
"use client";
import { useParams } from "next/navigation";
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { EmptyState } from '@/components/ui/emptyState';
import { useState } from 'react';
import { useMessageSocket } from "@/hooks/useMessageSocket";

export default function ConversationPage() {
  const params = useParams();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const userId = "02a7eb2c-3c71-4c7f-8dc8-716ddbd3f24f";

  // Initialize WebSocket for real-time messaging
  useMessageSocket(conversationId as string, userId);

  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    sender: { first_name: string; last_name: string };
  } | null>(null);

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
          userId={userId} // replace with real user id
        />
        <MessageInput 
          conversationId={conversationId}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
          userId={userId} // replace with real user id
        />
      </div>
    </>
  );
}