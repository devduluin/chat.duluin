// components/chat/MessageBubble.tsx
"use client";

import { forwardRef, useState, useRef, useEffect } from "react";
import { Avatar } from "../ui/avatar";
import { formatRelativeTime } from "@/utils/formatDate";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import {
  Reply,
  Trash2,
  ChevronDown,
  CornerUpLeft,
  CheckCheck,
  Check,
  SmilePlus,
  Forward,
  Copy,
  Edit,
  Pin,
  Info,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { motion } from "framer-motion";
import { DeleteConfirmDialog } from "@/components/alert/DeleteConfirmDialog";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { ImagePreviewModal } from "./ImagePreviewModal";
import { linkifyText } from "@/utils/linkify";
import { ForwardMessageDialog } from "./ForwardMessageDialog";
import { EditMessageDialog } from "./EditMessageDialog";
import { MessageInfoDialog } from "./MessageInfoDialog";
import { toast } from "sonner";
import {
  forwardMessage,
  editMessage,
  pinMessage,
} from "@/services/v1/messageService";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useChatStore } from "@/store/useChatStore";
import { useRetryMessage } from "@/hooks/useRetryMessage";

interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
  userAvatar?: string;
}

interface MessageBubbleProps {
  userId: string;
  message: Message;
  onReply?: (message: { id: string; content: string; sender: User }) => void;
  parentMessage?: Message | null;
  scrollToMessage?: (id: string) => void;
}

export const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
  ({ userId, message, onReply, parentMessage, scrollToMessage }, ref) => {
    const isCurrentUser = message.sender?.id === userId;
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [showReactors, setShowReactors] = useState(false);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [permanentDelete, setPermanentDelete] = useState(true);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [imagePreview, setImagePreview] = useState<{
      url: string;
      fileName: string;
    } | null>(null);
    const [showForwardDialog, setShowForwardDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showInfoDialog, setShowInfoDialog] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { updateMessageContent } = useConversationsStore();
    const updateChatMessageContent = useChatStore(
      (s) => s.updateMessageContent
    );
    const { retry } = useRetryMessage();

    const handleReply = () => {
      onReply?.({
        id: message.id,
        content: message.content,
        sender: message.sender,
      });
    };

    const handleDelete = () => {
      setOpenDeleteModal(true);
    };

    const handleRetry = () => {
      retry(message.id, message.conversation_id);
    };

    const confirmDelete = async (isPermanent: boolean) => {
      setOpenDeleteModal(false);
      if (isPermanent) {
        console.log("Permanently deleting message:", message.id);
      } else {
        console.log("Soft deleting message:", message.id);
      }
    };

    const handleReact = (emoji: string) => {
      const newReaction = {
        emoji,
        userId: userId,
        userName: "You",
        userAvatar: "",
      };
      setReactions((prev) => [...prev, newReaction]);
      setIsEmojiPickerOpen(false);
    };

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(message.content);
        toast.success("Message copied to clipboard");
      } catch (err) {
        toast.error("Failed to copy message");
      }
    };

    const handleForward = async (conversationIds: string[]) => {
      try {
        const result = await forwardMessage(
          message.id,
          conversationIds,
          userId
        );
        if (result?.success || result?.data) {
          toast.success(
            `Message forwarded to ${conversationIds.length} conversation(s)`
          );
        } else {
          toast.error("Failed to forward message");
        }
      } catch (error) {
        console.error("Error forwarding message:", error);
        toast.error("Failed to forward message");
      }
    };

    const handleEdit = async (messageId: string, newContent: string) => {
      try {
        const result = await editMessage(messageId, userId, newContent);
        if (result?.success || result?.data) {
          // Update message content in both stores
          updateMessageContent(message.conversation_id, messageId, newContent);
          updateChatMessageContent(
            message.conversation_id,
            messageId,
            newContent
          );
          toast.success("Message updated successfully");
        } else {
          toast.error("Failed to update message");
        }
      } catch (error) {
        console.error("Error editing message:", error);
        toast.error("Failed to update message");
      }
    };

    const handlePin = async () => {
      const newPinnedState = !isPinned;
      try {
        const result = await pinMessage(
          message.id,
          message.conversation_id,
          userId,
          newPinnedState
        );
        if (result?.success || result?.data) {
          setIsPinned(newPinnedState);
          toast.success(newPinnedState ? "Message pinned" : "Message unpinned");
        } else {
          toast.error("Failed to pin message");
        }
      } catch (error) {
        console.error("Error pinning message:", error);
        toast.error("Failed to pin message");
      }
    };

    const handleParentMessageClick = () => {
      if (parentMessage && scrollToMessage) {
        scrollToMessage(parentMessage.id);
      }
    };

    const reactionGroups = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push(reaction);
      return acc;
    }, {} as Record<string, Reaction[]>);

    const variants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    };

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (
          isEmojiPickerOpen &&
          dropdownRef.current &&
          !dropdownRef.current.contains(target) &&
          !target.closest(".emoji-picker-react")
        ) {
          setIsEmojiPickerOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isEmojiPickerOpen]);

    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={variants}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex mb-4 w-full",
          isCurrentUser ? "justify-end pl-10" : "justify-start pr-10"
        )}
      >
        {/* Avatar for received messages */}
        {!isCurrentUser && (
          <div className="flex-shrink-0 mr-2 self-start">
            <Avatar
              src={message.sender?.avatar_url || ""}
              name={`${message.sender?.first_name || "User"} ${
                message.sender?.last_name || ""
              }`}
              size="sm"
            />
          </div>
        )}

        <div
          className={cn(
            "flex flex-col",
            isCurrentUser ? "items-end" : "items-start",
            "max-w-[80%]"
          )}
        >
          {/* Sender name */}
          {!isCurrentUser && message.sender && (
            <Link
              href={`/conversation/${message.sender.email || ""}`}
              className="flex items-center mb-1 hover:underline cursor-pointer"
            >
              <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                {message.sender.first_name} {message.sender.last_name}
              </span>
              <ChevronDown className="h-3 w-3 ml-1 text-gray-500" />
            </Link>
          )}

          {/* Replied message preview */}
          {parentMessage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              onClick={handleParentMessageClick}
              className={cn(
                "mb-1 p-2 text-sm rounded-lg w-full max-w-full cursor-pointer hover:opacity-80 transition-opacity",
                isCurrentUser
                  ? "bg-blue-400/20 text-blue-700 dark:text-blue-300"
                  : "bg-gray-200/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300"
              )}
            >
              <div className="flex items-center text-xs font-medium mb-1">
                <CornerUpLeft className="h-3 w-3 mr-1" />
                Replying to {parentMessage.sender.first_name}{" "}
                {parentMessage.sender.last_name}
              </div>
              <div className="truncate text-sm">
                {parentMessage.content || "Message deleted"}
              </div>
            </motion.div>
          )}

          {/* Message bubble with dropdown */}
          <div className="relative" ref={dropdownRef}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  ref={ref}
                  className={cn(
                    "rounded-2xl px-4 py-3 cursor-pointer",
                    isCurrentUser
                      ? "bg-blue-500 text-white rounded-tr-none"
                      : "bg-white dark:bg-gray-700 rounded-tl-none"
                  )}
                >
                  {/* Display attachments if any */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div
                      className={cn(
                        "mb-2 space-y-2",
                        message.content ? "" : ""
                      )}
                    >
                      {message.attachments.map((attachment: any) => (
                        <div key={attachment.id}>
                          {attachment.attachment_type === "image" ? (
                            <div className="relative group">
                              <img
                                src={`http://localhost:3000${attachment.file_url}`}
                                alt={attachment.file_name}
                                className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                style={{
                                  maxHeight: "300px",
                                  objectFit: "contain",
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setImagePreview({
                                    url: `http://localhost:3000${attachment.file_url}`,
                                    fileName: attachment.file_name,
                                  });
                                }}
                              />
                              {/* Download button overlay */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const link = document.createElement("a");
                                  link.href = `http://localhost:3000${attachment.file_url}`;
                                  link.download = attachment.file_name;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white p-2 rounded-full hover:bg-black/80"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                  />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            // Non-image file attachment
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                const link = document.createElement("a");
                                link.href = `http://localhost:3000${attachment.file_url}`;
                                link.download = attachment.file_name;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-600 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-8 w-8 text-gray-600 dark:text-gray-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              </svg>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {attachment.file_name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {(attachment.file_size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-gray-600 dark:text-gray-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {message.content && (
                    <div>
                      <p className="break-words whitespace-pre-wrap">
                        {linkifyText(message.content)}
                      </p>
                      {/* Pinned indicator */}
                      {isPinned && (
                        <div className="flex items-center mt-2 text-xs opacity-70">
                          <Pin className="h-3 w-3 mr-1" />
                          <span>Pinned</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align={isCurrentUser ? "end" : "start"}
                className="w-48 p-0"
                onInteractOutside={(e) => {
                  const target = e.target as HTMLElement;
                  if (
                    target.closest(".emoji-picker-react") ||
                    target.closest(".emoji-picker-wrapper")
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                <DropdownMenuItem onClick={handleReply} className="px-4 py-2">
                  <Reply className="mr-2 h-4 w-4" />
                  Reply
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setShowForwardDialog(true)}
                  className="px-4 py-2"
                >
                  <Forward className="mr-2 h-4 w-4" />
                  Forward
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleCopy} className="px-4 py-2">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </DropdownMenuItem>

                {isCurrentUser && (
                  <DropdownMenuItem
                    onClick={() => setShowEditDialog(true)}
                    className="px-4 py-2"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={handlePin} className="px-4 py-2">
                  <Pin
                    className={`mr-2 h-4 w-4 ${isPinned ? "fill-current" : ""}`}
                  />
                  {isPinned ? "Unpin" : "Pin"}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setShowInfoDialog(true)}
                  className="px-4 py-2"
                >
                  <Info className="mr-2 h-4 w-4" />
                  Info
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleDelete}
                  className="px-4 py-2 text-red-600 dark:text-red-400"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setIsEmojiPickerOpen(!isEmojiPickerOpen);
                  }}
                  className="px-4 py-2"
                >
                  <SmilePlus className="mr-2 h-4 w-4" />
                  <span>Add Reaction</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Emoji Picker positioned above the dropdown */}
            {isEmojiPickerOpen && (
              <div className="emoji-picker-wrapper absolute bottom-full right-0 mb-2 z-[100]">
                <EmojiPicker
                  width={300}
                  height={350}
                  onEmojiClick={(emojiData: EmojiClickData) => {
                    handleReact(emojiData.emoji);
                    setIsEmojiPickerOpen(false);
                    document.dispatchEvent(
                      new KeyboardEvent("keydown", { key: "Escape" })
                    );
                  }}
                  previewConfig={{ showPreview: false }}
                  skinTonesDisabled
                  searchDisabled
                  lazyLoadEmojis
                  className="shadow-lg rounded-lg border border-gray-200 dark:border-gray-700"
                />
              </div>
            )}
          </div>

          {/* Message footer */}
          <div className="flex items-center mt-1 space-x-1">
            {Object.entries(reactionGroups).map(([emoji, reactors]) => (
              <Tooltip key={emoji}>
                <TooltipTrigger asChild>
                  <button
                    className="text-sm bg-white dark:bg-gray-800 rounded-full px-1 border border-gray-200 dark:border-gray-700 flex items-center"
                    onClick={() => setShowReactors(true)}
                  >
                    <span className="text-lg">{emoji}</span>
                    {reactors.length > 1 && (
                      <span className="text-xs ml-1">{reactors.length}</span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <div className="space-y-1">
                    <p className="font-medium">{emoji} Reacted by:</p>
                    <div className="max-h-40 overflow-y-auto">
                      {reactors.map((reactor) => (
                        <div
                          key={reactor.userId}
                          className="flex items-center py-1"
                        >
                          <Avatar
                            src={reactor.userAvatar}
                            name={reactor.userName}
                            size="md"
                            className="mr-2"
                          />
                          <span>{reactor.userName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatRelativeTime(message.created_at || "")}
            </p>
            {isCurrentUser && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      {message.status === "pending" ? (
                        <Clock className="h-3 w-3 text-yellow-500" />
                      ) : message.status === "sending" ? (
                        <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
                      ) : message.status === "failed" ? (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      ) : message.read_at ? (
                        <CheckCheck className="h-3 w-3 text-blue-500" />
                      ) : (
                        <Check className="h-3 w-3 text-gray-400" />
                      )}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {message.status === "pending"
                      ? "Waiting to send..."
                      : message.status === "sending"
                      ? "Sending..."
                      : message.status === "failed"
                      ? "Failed to send. Click retry button to resend."
                      : message.read_at
                      ? `Read at ${new Date(message.read_at).toLocaleString()}`
                      : "Delivered"}
                  </TooltipContent>
                </Tooltip>
                {message.status === "failed" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleRetry}
                        className="ml-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-0.5 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3 text-red-500 hover:text-red-600" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Retry sending message
                    </TooltipContent>
                  </Tooltip>
                )}
              </>
            )}
          </div>
        </div>

        {/* Spacer */}
        {isCurrentUser && <div className="flex-shrink-0 ml-2 w-8" />}

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={openDeleteModal}
          isPermanent={permanentDelete}
          onConfirm={confirmDelete}
          onCancel={() => setOpenDeleteModal(false)}
          onTogglePermanent={setPermanentDelete}
          title="Delete Chat Message"
          description="Are you sure you want to delete this message?"
        />

        {/* Image Preview Modal */}
        {imagePreview && (
          <ImagePreviewModal
            open={!!imagePreview}
            onClose={() => setImagePreview(null)}
            imageUrl={imagePreview.url}
            fileName={imagePreview.fileName}
          />
        )}

        {/* Forward Message Dialog */}
        <ForwardMessageDialog
          open={showForwardDialog}
          onClose={() => setShowForwardDialog(false)}
          message={message}
          onForward={handleForward}
        />

        {/* Edit Message Dialog */}
        <EditMessageDialog
          open={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          message={message}
          onEdit={handleEdit}
        />

        {/* Message Info Dialog */}
        <MessageInfoDialog
          open={showInfoDialog}
          onClose={() => setShowInfoDialog(false)}
          message={message}
        />
      </motion.div>
    );
  }
);

MessageBubble.displayName = "MessageBubble";
