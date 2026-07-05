// app/conversation/[id]/page.tsx
"use client";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { EmptyState } from "@/components/ui/emptyState";
import { useState, useEffect, useRef, useCallback } from "react";
import { useMessageSocket } from "@/hooks/useMessageSocket";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { useAccountStore } from "@/store/useAccountStore";
import { markConversationAsRead } from "@/services/v1/readService";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useChatStore } from "@/store/useChatStore";
import Cookies from "js-cookie";
import { usePinnedMessages } from "@/hooks/usePinnedMessages";
import { PinnedMessagesBar } from "@/components/chat/PinnedMessagesBar";
import { E2EEActivationBanner } from "@/components/chat/E2EEActivationBanner";

const EMPTY_MESSAGES: Message[] = [];

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { data: account } = useAccountStore();
  const updateConversation = useConversationsStore((s) => s.updateConversation);
  const conversations = useConversationsStore((s) => s.conversations);
  const isConnected = useWebSocketStore((s) => s.isConnected);

  // Get userId from account store or fallback to cookies
  const userIdFromCookies =
    typeof window !== "undefined" ? Cookies.get("user_id") || "" : "";
  const userId = userIdFromCookies;

  console.log("🔍 ConversationPage - userId:", {
    fromAccount: account?.id,
    fromCookies: userIdFromCookies,
    finalUserId: userId,
  });

  // Pinned messages hook
  const {
    pinnedMessages,
    loading: loadingPinned,
    refreshPinnedMessages,
  } = usePinnedMessages(conversationId as string);

  // Ref to store scrollToMessage function from MessageList
  const scrollToMessageRef = useRef<((messageId: string) => void) | null>(null);
  const handleScrollToMessageReady = useCallback(
    (fn: (messageId: string) => void) => {
      scrollToMessageRef.current = fn;
    },
    [],
  );

  // Check if conversation is group
  const currentConversation = conversations.find(
    (conv) => conv?.Conversation?.id === conversationId,
  );
  const isGroupConversation =
    currentConversation?.Conversation?.is_group || false;


  // Initialize WebSocket for real-time messaging (only after auth check and userId available)
  const { sendMessage } = useMessageSocket(
    conversationId as string,
    userId, // Use userId with fallback
  );

  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    content: string;
    sender: { first_name: string; last_name: string };
  } | null>(null);

  const messages = useChatStore((state) =>
    conversationId
      ? state.messages[conversationId as string] || EMPTY_MESSAGES
      : EMPTY_MESSAGES,
  );
  const lastReadReceiptSentMessageIdRef = useRef<string | null>(null);
  const markedReadConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    lastReadReceiptSentMessageIdRef.current = null;
  }, [conversationId, userId]);

  // Mark conversation as read when opened (only if authenticated and has userId)
  useEffect(() => {
    if (!userId) return;

    if (conversationId) {
      if (markedReadConversationIdRef.current === conversationId) return;
      markedReadConversationIdRef.current = conversationId;
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

  useEffect(() => {
    if (!userId || !conversationId) return;
    if (!isConnected) return;
    if (!messages || messages.length === 0) return;

    let lastInboundMessage: Message | null = null;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      const messageType =
        (msg as any)?.message_type || (msg as any)?.MessageType || "";
      const isTextMessage =
        messageType === "text" || messageType === "e2ee_text";
      if (isTextMessage && msg?.sender_id && msg.sender_id !== userId) {
        lastInboundMessage = msg;
        break;
      }
    }

    if (!lastInboundMessage?.id) return;
    if (lastReadReceiptSentMessageIdRef.current === lastInboundMessage.id) return;

    const sent = sendMessage({
      type: "read",
      conversation_id: conversationId,
      message_id: lastInboundMessage.id,
      content: "read",
    });
    if (sent) {
      lastReadReceiptSentMessageIdRef.current = lastInboundMessage.id;
    }
  }, [conversationId, userId, isConnected, messages, sendMessage]);

  // Listen for navigate-home event (smooth redirect when removed from group)
  useEffect(() => {
    const handleNavigateHome = (event: any) => {
      console.log("🏠 Navigate home event received:", event.detail);
      router.push("/");
    };

    window.addEventListener("navigate-home", handleNavigateHome);
    return () => {
      window.removeEventListener("navigate-home", handleNavigateHome);
    };
  }, [router]);


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
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col h-screen w-full">
        <ChatHeader conversationId={conversationId} userId={userId} />
        <E2EEActivationBanner conversationId={conversationId} />
        {pinnedMessages.length > 0 && (
          <PinnedMessagesBar
            pinnedMessages={pinnedMessages}
            onMessageClick={(messageId) => {
              scrollToMessageRef.current?.(messageId);
            }}
            onRefresh={refreshPinnedMessages}
          />
        )}
        <MessageList
          conversationId={conversationId}
          onReply={setReplyingTo}
          userId={userId}
          pinnedMessages={pinnedMessages}
          onPinChange={refreshPinnedMessages}
          onScrollToMessageReady={handleScrollToMessageReady}
          isGroupConversation={isGroupConversation}
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
