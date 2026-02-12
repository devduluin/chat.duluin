// components/chat/MessageInput.tsx
"use client";

import { useState, useRef, useEffect, use } from "react";
import { Button } from "../ui/button";
import {
  Paperclip,
  Smile,
  SendHorizonal,
  X,
  Image as ImageIcon,
  FileText,
  Contact,
  File,
  CheckSquare,
  WifiOff,
  Wifi,
} from "lucide-react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ContactPicker } from "./attachments/ContactPicker";
import { TaskCreator } from "./attachments/TaskCreator";
import { ApplicationPicker } from "./attachments/ApplicationPicker";
import { useChatStore } from "@/store/useChatStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useOfflineQueueStore } from "@/store/useOfflineQueueStore";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { toast } from "sonner";
import { dummyUser } from "@/lib/dummyChat";
import { v4 as uuidv4 } from "uuid";
import Cookies from "js-cookie";

export function MessageInput({
  userId,
  conversationId,
  replyingTo,
  onCancelReply,
  sendMessage: sendMessageViaWebSocket,
}: {
  userId: string;
  conversationId: string;
  replyingTo?: {
    id: string;
    content: string;
    sender: { first_name: string; last_name: string };
  } | null;
  onCancelReply?: () => void;
  sendMessage?: (payload: string | object) => boolean;
}) {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showTaskCreator, setShowTaskCreator] = useState(false);
  const [showApplicationPicker, setShowApplicationPicker] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessageStatus = useChatStore((s) => s.updateMessageStatus);
  const { sendMessage: sendMessageOffline } = useSendMessage();
  const { isOnline } = useOfflineQueueStore();
  const { isConnected: isWebSocketConnected } = useWebSocketStore();

  const API_URL = process.env.NEXT_PUBLIC_GATEWAY_API_URL_DEV;

  const setMessages = useChatStore((s) => s.setMessages);

  // Check if user is still a member of this conversation
  const conversation = useChatStore((s) => s.conversations[conversationId]);
  const conversationFromList = useConversationsStore((s) =>
    s.conversations.find(
      (item: any) => item.Conversation.id === conversationId,
    ),
  );

  // Subscribe to version to force re-render when state changes
  const storeVersion = useChatStore((s) => s._version);

  // Check is_user_member from both stores
  const isUserMemberChat = (conversation as any)?.is_user_member;
  const isUserMemberList = conversationFromList?.Conversation?.is_user_member;

  // Also check if current user is in the members list as a fallback
  const members = useChatStore((s) => s.members[conversationId]);

  // Check multiple possible field names for user ID in members
  const isInMemberList =
    members && members.length > 0
      ? members.some((m: any) => {
          const memberUserId =
            m.user_id || m.UserID || m.user?.id || m.User?.id;
          return memberUserId === userId;
        })
      : undefined; // undefined if no members data yet

  // Priority logic:
  // 1. If is_user_member explicitly false in EITHER store -> NOT member
  // 2. If is_user_member explicitly true in EITHER store -> IS member
  // 3. Otherwise, check member list
  const isUserMember =
    isUserMemberChat === false || isUserMemberList === false
      ? false // Explicitly removed
      : isUserMemberChat === true || isUserMemberList === true
        ? true // Explicitly member
        : isInMemberList === true; // Fallback to member list check

  const isGroupChat =
    conversation?.is_group ||
    conversationFromList?.Conversation?.is_group ||
    false;

  // Debug log to check member status
  console.log("🔍 MessageInput - Member Status Check:", {
    conversationId,
    userId,
    isGroupChat,
    storeVersion,
    is_user_member_chat: (conversation as any)?.is_user_member,
    is_user_member_list: conversationFromList?.Conversation?.is_user_member,
    isUserMemberChat,
    isUserMemberList,
    isInMemberList,
    membersCount: members?.length,
    memberIds: members?.map(
      (m: any) => m.user_id || m.UserID || m.user?.id || m.User?.id,
    ),
    currentUserId: userId,
    finalIsUserMember: isUserMember,
    logic:
      "isUserMemberChat === false || isUserMemberList === false ? false : isUserMemberChat === true || isUserMemberList === true ? true : isInMemberList === true",
    conversation,
    conversationFromList,
  });

  // Get tenantId from cookies
  const tenantId =
    typeof window !== "undefined" ? Cookies.get("tenant_id") || "" : "";

  // Auto-focus when replyingTo changes
  useEffect(() => {
    console.log("Replying to:", replyingTo);
    if (replyingTo && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [replyingTo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && attachedFiles.length === 0) return;

    const messageId = uuidv4();

    // Upload files first if there are any
    const uploadPromises = attachedFiles.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", userId);

      try {
        const response = await fetch(`${API_URL}/api/v1/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const result = await response.json();
        if (result.status && result.data) {
          return result.data.id; // Return attachment ID
        }
        return null;
      } catch (error) {
        console.error("Failed to upload file:", error);
        toast.error(`Failed to upload ${file.name}`);
        return null;
      }
    });

    // Wait for all uploads to complete
    Promise.all(uploadPromises).then((attachmentIds) => {
      // Filter out any failed uploads (null values)
      const validAttachmentIds = attachmentIds.filter(
        (id) => id !== null,
      ) as string[];

      // Build message content
      let contents: any = {
        conversation_id: conversationId,
        content: message.trim() || (attachedFiles.length > 0 ? "📷 Photo" : ""),
      };

      if (replyingTo?.id) {
        contents.parent_message_id = replyingTo.id;
      }

      if (validAttachmentIds.length > 0) {
        contents.attachment_ids = validAttachmentIds;
      }

      // Use offline-aware send message
      sendMessageOffline({
        conversationId,
        content: message.trim() || (attachedFiles.length > 0 ? "📷 Photo" : ""),
        senderId: userId,
        tenantId,
        parentMessageId: replyingTo?.id,
        attachmentIds:
          validAttachmentIds.length > 0 ? validAttachmentIds : undefined,
        sendViaWebSocket: sendMessageViaWebSocket,
      });

      setMessage("");
      setAttachedFiles([]);
      onCancelReply?.();
    });
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const emoji = emojiData.emoji;
    const newMessage =
      message.substring(0, cursorPosition) +
      emoji +
      message.substring(cursorPosition);
    setMessage(newMessage);
    setShowEmojiPicker(false);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.selectionStart = cursorPosition + emoji.length;
        inputRef.current.selectionEnd = cursorPosition + emoji.length;
      }
    }, 0);
  };

  useEffect(() => {
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [inputRef.current]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Add new files to the existing array
      setAttachedFiles((prev) => [...prev, ...Array.from(files)]);
      // toast("File(s) attached!", {
      //   description: `${files.length} file(s) have been added.`,
      // });
    }
    // Important: Reset the input value to allow selecting the same file again
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachedFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove),
    );
  };

  const attachmentOptions = [
    {
      name: "Contact",
      icon: <Contact className="h-4 w-4 mr-2" />,
      action: () => setShowContactPicker(true),
    },
    {
      name: "Photo",
      icon: <ImageIcon className="h-4 w-4 mr-2" />,
      action: () => fileInputRef.current?.click(),
    },
    {
      name: "Application",
      icon: <File className="h-4 w-4 mr-2" />,
      action: () => setShowApplicationPicker(true),
    },
    {
      name: "Task",
      icon: <CheckSquare className="h-4 w-4 mr-2" />,
      action: () => setShowTaskCreator(true),
    },
  ];

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 relative">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        multiple
      />

      {/* Modals */}
      <ContactPicker
        open={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        onSelect={(contact) => {
          toast("Contact attached!", {
            description: `${contact.name}`,
          });
        }}
      />

      <TaskCreator
        open={showTaskCreator}
        onClose={() => setShowTaskCreator(false)}
        onCreate={(task) => {
          toast("Task created!", {
            description: `${task.title}`,
          });
        }}
        members={[
          { id: "1", name: "Alice" },
          { id: "2", name: "Bob" },
          { id: "3", name: "Charlie" },
        ]}
      />

      <ApplicationPicker
        open={showApplicationPicker}
        onClose={() => setShowApplicationPicker(false)}
        onSelect={(app) => {
          toast("Application attached!", {
            description: `${app.name}`,
          });
        }}
      />

      {/* Reply preview */}
      {replyingTo && (
        <div className="relative bg-gray-100 dark:bg-gray-800 rounded-t-lg p-2 mb-2 text-sm">
          <div className="text-gray-500 dark:text-gray-400">
            Replying to {replyingTo.sender.first_name}:
          </div>
          <div className="truncate">{replyingTo.content}</div>
          <button
            onClick={onCancelReply}
            className="absolute right-2 top-2 p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Attachment preview */}
      {attachedFiles.length > 0 && (
        <div className="relative bg-gray-100 dark:bg-gray-800 rounded-t-lg p-3 mb-2">
          <div className="flex flex-wrap gap-3">
            {attachedFiles.map((file, index) => (
              <div key={index} className="relative">
                {/* Show image thumbnail */}
                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="h-20 w-20 object-cover rounded-md border border-gray-300"
                    // Best practice: revoke the object URL when the component unmounts
                    // to prevent memory leaks, though it's less critical for short-lived components.
                    onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                  />
                ) : (
                  // Show generic file preview
                  <div className="h-20 w-20 bg-gray-200 dark:bg-gray-700 rounded-md flex flex-col items-center justify-center p-1 border border-gray-300">
                    <FileText className="h-8 w-8 text-gray-500" />
                    <span className="text-xs truncate w-full text-center mt-1 dark:text-gray-300">
                      {file.name}
                    </span>
                  </div>
                )}
                {/* Button to remove a single attachment */}
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(index)}
                  className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          {/* Button to clear all attachments */}
          <button
            onClick={() => setAttachedFiles([])}
            className="absolute right-2 top-2 p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Show message if user is not a member */}
      {isGroupChat && !isUserMember ? (
        <div className="flex items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <WifiOff className="h-5 w-5" />
            <span className="text-sm font-medium">
              You are not a group participant. You can view the chat history but
              cannot send messages.
            </span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          {/* Network status indicator */}
          {!isOnline && (
            <div className="flex items-center space-x-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 rounded-full text-xs">
              <WifiOff className="h-3 w-3" />
              <span>Offline</span>
            </div>
          )}

          {/* Attachment dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              {attachmentOptions.map((option) => (
                <DropdownMenuItem
                  key={option.name}
                  onSelect={option.action}
                  className="cursor-pointer"
                >
                  {option.icon}
                  {option.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Message input */}
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onClick={handleInputClick}
            onKeyUp={handleKeyUp}
            placeholder="Type a message..."
            className="flex-1 border mb-2 border-gray-300 dark:border-gray-600 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />

          {/* Emoji picker */}
          <div className="relative">
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
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
            disabled={!message.trim() && attachedFiles.length === 0}
            title={
              !isWebSocketConnected
                ? "Will send via queue (offline mode)"
                : "Send message via WebSocket"
            }
          >
            <SendHorizonal className="h-5 w-5" />
          </Button>
        </form>
      )}

      {/* Connection status indicator - informational only, not blocking */}
      {!isWebSocketConnected && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-xs flex items-center gap-2 z-50">
          <WifiOff className="h-3 w-3" />
          Offline mode - messages will sync later
        </div>
      )}
    </div>
  );
}
