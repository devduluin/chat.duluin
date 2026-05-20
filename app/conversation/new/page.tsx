"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/chat/Sidebar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/emptyState";
import { ChevronLeft, SendHorizonal, Smile, MessageSquare } from "lucide-react";
import Cookies from "js-cookie";
import { Suspense, useState, useEffect, useRef } from "react";
import { getUserById } from "@/services/chatUserService";
import { useSendMessage } from "@/hooks/useSendMessage";
import { dummyUser } from "@/lib/dummyChat";
import { toast } from "sonner";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";

function NewConversationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const contactId = searchParams.get("contact");

  const [contactData, setContactData] = useState<any | null>(null);
  const [loadingContact, setLoadingContact] = useState(true);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const { sendMessage } = useSendMessage();

  // Get userId and tenantId
  const userId = typeof window !== "undefined" ? Cookies.get("user_id") || "" : "";
  const tenantId = typeof window !== "undefined" ? Cookies.get("tenant_id") || dummyUser.tenant_id : dummyUser.tenant_id;

  useEffect(() => {
    if (!contactId) {
      setLoadingContact(false);
      return;
    }

    const fetchContact = async () => {
      try {
        setLoadingContact(true);
        const res = await getUserById(contactId);
        if (res && res.status && res.data) {
          setContactData(res.data);
        }
      } catch (err) {
        console.error("Failed to load contact info:", err);
        toast.error("Failed to load contact information");
      } finally {
        setLoadingContact(false);
      }
    };

    fetchContact();
  }, [contactId]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || isSending || !contactData?.id) return;

    setIsSending(true);
    try {
      const recipientId = contactData.id;
      const result = await sendMessage({
        conversationId: "new",
        content: messageText.trim(),
        senderId: userId,
        tenantId: tenantId,
        recipientId: recipientId,
      });

      if (result && result.success && result.conversationId) {
        setMessageText("");
        // Redirect to the newly created conversation
        router.push(`/conversation/${result.conversationId}`);
      } else {
        setIsSending(false);
      }
    } catch (error) {
      console.error("Failed to send first message:", error);
      toast.error("Failed to send message");
      setIsSending(false);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const emoji = emojiData.emoji;
    const newMessage =
      messageText.substring(0, cursorPosition) +
      emoji +
      messageText.substring(cursorPosition);
    setMessageText(newMessage);
    setShowEmojiPicker(false);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.selectionStart = cursorPosition + emoji.length;
        inputRef.current.selectionEnd = cursorPosition + emoji.length;
      }
    }, 0);
  };

  const handleInputClick = () => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart || 0);
    }
  };

  const handleKeyUp = () => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart || 0);
    }
  };

  if (!contactId) {
    return (
      <div className="flex-1 flex flex-col h-screen">
        <EmptyState
          title="No contact selected"
          description="Please select a contact from the list to start a new chat"
          icon="chat"
        />
      </div>
    );
  }

  if (loadingContact) {
    return (
      <div className="flex-1 flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading contact profile...</p>
        </div>
      </div>
    );
  }

  if (!contactData) {
    return (
      <div className="flex-1 flex flex-col h-screen">
        <EmptyState
          title="Contact not found"
          description="The selected contact could not be found or has been deleted."
          icon="chat"
        />
      </div>
    );
  }

  const fullName = `${contactData.first_name || ""} ${contactData.last_name || ""}`.trim();
  const avatarUrl = contactData.avatar_url || "";
  const email = contactData.email || "";

  return (
    <>
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col h-screen w-full bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-500 hover:text-gray-700"
              onClick={() => router.push("/")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Avatar src={avatarUrl} name={fullName} size="sm" isOnline={contactData.status === "online"} />
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                {fullName}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Draft Conversation • {email}
              </p>
            </div>
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
          <div className="max-w-md w-full text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col items-center">
            <div className="relative mb-4">
              <Avatar src={avatarUrl} name={fullName} size="lg" className="w-20 h-20 shadow-md" />
              <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1.5 border-4 border-white dark:border-gray-800 shadow-sm">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              Start a Conversation
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 px-4">
              Send your first message to initiate a new direct chat with <strong>{fullName}</strong>.
            </p>
            <div className="w-full h-[1px] bg-gray-100 dark:bg-gray-700 mb-6"></div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Ready to Chat
            </span>
          </div>
        </div>

        {/* Message Input Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 relative">
          <form onSubmit={handleSend} className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onClick={handleInputClick}
              onKeyUp={handleKeyUp}
              placeholder={`Message ${fullName}...`}
              disabled={isSending}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50"
            />

            {/* Emoji picker */}
            <div className="relative">
              <button
                type="button"
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={isSending}
              >
                <Smile className="h-5 w-5" />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-12 right-0 z-10">
                  <EmojiPicker
                    width={300}
                    height={350}
                    onEmojiClick={handleEmojiClick}
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}
            </div>

            {/* Send button */}
            <Button
              type="submit"
              variant="default"
              size="icon"
              disabled={!messageText.trim() || isSending}
              className="bg-green-600 hover:bg-green-700 text-white rounded-full w-9 h-9 flex items-center justify-center"
            >
              <SendHorizonal className="h-5 w-5 text-white" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}

export default function NewConversationPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
      </div>
    }>
      <NewConversationContent />
    </Suspense>
  );
}
