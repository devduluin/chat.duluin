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
import { toast } from "sonner";
import { dummyUser } from "@/lib/dummyChat";
import { v4 as uuidv4 } from "uuid";

export function MessageInput({
  userId,
  conversationId,
  replyingTo,
  onCancelReply,
}: {
  userId: string;
  conversationId: string;
  replyingTo?: {
    id: string;
    content: string;
    sender: { first_name: string; last_name: string };
  } | null;
  onCancelReply?: () => void;
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

  const setMessages = useChatStore((s) => s.setMessages);

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
        const response = await fetch("http://localhost:3000/api/v1/upload", {
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
        (id) => id !== null
      ) as string[];

      const newMsg = {
        id: messageId,
        conversation_id: conversationId,
        parent_message_id: replyingTo?.id,
        sender_id: userId,
        content: message || (attachedFiles.length > 0 ? "📷 Photo" : ""),
        created_at: new Date().toISOString(),
        status: "pending" as const,
        is_system_message: false,
        sender: dummyUser,
      };

      // Attempt to send the message via WebSocket
      let ws: WebSocket | null = null;
      try {
        ws = new WebSocket(`ws://localhost:3000/api/v1/chat/${userId}`);

        let contents: any = {
          conversation_id: conversationId,
          content:
            message.trim() || (attachedFiles.length > 0 ? "📷 Photo" : ""),
        };

        if (replyingTo?.id) {
          contents.parent_message_id = replyingTo.id;
        }

        if (validAttachmentIds.length > 0) {
          contents.attachment_ids = validAttachmentIds;
        }

        ws.onopen = () => {
          ws?.send(JSON.stringify(contents));
          updateMessageStatus(messageId, conversationId, "sent");
          toast.success("Message sent successfully");
        };

        ws.onerror = (error) => {
          setMessages(conversationId, [newMsg]);
          addMessage(conversationId, newMsg);
          toast.error("Failed to send message. Queued for retry.");
        };

        ws.onclose = () => {
          console.warn("WebSocket connection closed");
        };
      } catch (err) {
        console.error("WebSocket connection failed:", err);
        toast.error("Offline - message will be sent later");
      }

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
      prevFiles.filter((_, index) => index !== indexToRemove)
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

      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
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
        >
          <SendHorizonal className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
