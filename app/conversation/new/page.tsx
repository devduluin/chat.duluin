"use client";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { EmptyState } from "@/components/ui/emptyState";
import Cookies from "js-cookie";

export default function NewConversationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const contactId = searchParams.get("contact");

  // Get userId from cookies
  const userIdFromCookies =
    typeof window !== "undefined" ? Cookies.get("user_id") || "" : "";
  const userId = userIdFromCookies;

  // If you want to be extra safe:
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
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
  return (
    <>
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen">
        <ChatHeader conversationId={conversationId} userId={userId} />
        <MessageList conversationId={conversationId} userId={userId} />
        <MessageInput conversationId={conversationId} userId={userId} />
      </div>
    </>
  );
}
