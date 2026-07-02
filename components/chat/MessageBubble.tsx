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
  Phone,
  Video,
  User,
  UserPlus,
  Mail,
  Download,
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
  deleteMessage,
} from "@/services/v1/messageService";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useChatStore } from "@/store/useChatStore";
import { useWebSocketStore } from "@/store/useWebSocketStore";
import { useRetryMessage } from "@/hooks/useRetryMessage";
import { useContactsStore } from "@/store/useContactStore";
import { useContactsList } from "@/hooks/useContacts";
import { Button } from "../ui/button";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";


interface MessageBubbleProps {
  userId: string;
  message: Message;
  onReply?: (message: { id: string; content: string; sender: User }) => void;
  parentMessage?: Message | null;
  scrollToMessage?: (id: string) => void;
  isPinnedMessage?: boolean;
  onPinChange?: () => void;
  isGroupConversation?: boolean;
}

export const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
  (
    {
      userId,
      message,
      onReply,
      parentMessage,
      scrollToMessage,
      isPinnedMessage = false,
      onPinChange,
      isGroupConversation = false,
    },
    ref,
  ) => {
    const isCurrentUser = message.sender?.id === userId;
    const router = useRouter();
    const [loadingContactChat, setLoadingContactChat] = useState(false);
    const [savingContact, setSavingContact] = useState(false);
    const { fetchContactsList } = useContactsList(userId);
    const isVoiceCallMessage =
      message.content?.startsWith("📞 Panggilan suara aktif") ||
      message.content?.startsWith("📞 Suara panggilan berakhir") ||
      message.content?.startsWith("📞 Panggilan suara berakhir");
    const isVideoCallMessage =
      message.content?.startsWith("📹 Panggilan video aktif") ||
      message.content?.startsWith("📹 Video panggilan berakhir");
    const [reactions, setReactions] = useState<Reaction[]>(message.reactions || []);
    const [showReactors, setShowReactors] = useState(false);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [permanentDelete, setPermanentDelete] = useState(false);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const [imagePreview, setImagePreview] = useState<{
      images: { url: string; fileName: string }[];
      initialIndex: number;
    } | null>(null);
    const [showForwardDialog, setShowForwardDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showInfoDialog, setShowInfoDialog] = useState(false);
    const [isPinned, setIsPinned] = useState(isPinnedMessage);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { updateMessageContent } = useConversationsStore();
    const updateChatMessageContent = useChatStore(
      (s) => s.updateMessageContent,
    );
    const { retry } = useRetryMessage();
    const { contacts } = useContactsStore();
    const sendMessage = useWebSocketStore((s) => s.sendMessage);

    const getSenderName = (sender: any) => {
      if (!sender) return "User";
      const found = contacts?.find((c) => {
        const targetId = c.target?.id || (c as any).target_id || (c as any).TargetID;
        return targetId && targetId === sender.id;
      });
      if (found) {
        const firstName = (found as any).first_name || (found as any).FirstName || found.target?.first_name || "";
        const lastName = (found as any).last_name || (found as any).LastName || found.target?.last_name || "";
        if (firstName || lastName) {
          return `${firstName} ${lastName}`.trim();
        }
      }
      return `${sender.first_name || ""} ${sender.last_name || ""}`.trim() || "User";
    };

    const parseContactCard = (content: string) => {
      const lines = content.split("\n");
      let name = "";
      let phone = "";
      let email = "";

      for (const line of lines) {
        if (line.startsWith("Nama:")) {
          name = line.replace("Nama:", "").trim();
        } else if (line.startsWith("Telepon:")) {
          phone = line.replace("Telepon:", "").trim();
        } else if (line.startsWith("Email:")) {
          email = line.replace("Email:", "").trim();
        }
      }

      return { name, phone, email };
    };

    const handleContactMessageClick = async (phone: string) => {
      if (!phone || phone === "-") {
        toast.error("Nomor telepon tidak valid.");
        return;
      }

      setLoadingContactChat(true);
      try {
        const { searchContact } = await import("@/services/v1/contactService");
        const result = await searchContact(phone);
        if (result && result.status && result.data) {
          const targetUser = result.data;
          const targetUserId = targetUser.id;

          const userId = Cookies.get("user_id") || "";
          const tenantId = Cookies.get("tenant_id") || "";

          if (!userId) {
            toast.error("Sesi Anda telah berakhir. Silakan login kembali.");
            setLoadingContactChat(false);
            return;
          }

          if (targetUserId === userId) {
            toast.error("Anda tidak bisa memulai chat dengan diri Anda sendiri.");
            setLoadingContactChat(false);
            return;
          }

          const { useConversationsStore } = await import("@/store/useConversationsStore");
          const { conversations } = useConversationsStore.getState();
          const existingConv = conversations.find((conv: any) => {
            if (conv.Conversation?.is_group) return false;

            const members = conv.Conversation?.members || [];
            if (conv.other_user_id === targetUserId) return true;

            if (members.length === 2) {
              const hasCurrentUser = members.some((m: any) => m.user_id === userId);
              const hasTargetUser = members.some((m: any) => m.user_id === targetUserId);
              return hasCurrentUser && hasTargetUser;
            }
            return false;
          });

          if (existingConv) {
            toast.success("Membuka obrolan...");
            router.push(`/conversation/${existingConv.Conversation.id}`);
          } else {
            toast.success("Membuka halaman obrolan baru...");
            router.push(`/conversation/new?contact=${targetUserId}`);
          }
        } else {
          toast.error("Kontak tidak terdaftar di platform duluin.");
        }
      } catch (err: any) {
        console.error("Failed to start conversation from contact card:", err);
        toast.error(err?.message || "Terjadi kesalahan saat menghubungi kontak.");
      } finally {
        setLoadingContactChat(false);
      }
    };

    const handleSaveContact = async (parsed: { name: string; phone: string; email: string }) => {
      if (!parsed.phone || parsed.phone === "-") {
        toast.error("Nomor telepon tidak valid.");
        return;
      }

      const isAlreadyContact = contacts?.some((c) => {
        const cPhone = c.phone || c.target?.phone;
        return cPhone && cPhone === parsed.phone;
      });

      if (isAlreadyContact) {
        toast.error("Kontak sudah ada sebelumnya");
        return;
      }

      setSavingContact(true);
      try {
        const { findContact } = await import("@/services/userService");
        const res = await findContact(parsed.phone);
        const result = res?.result;

        if (!result) {
          toast.error("User tidak ditemukan.");
          setSavingContact(false);
          return;
        }

        if (result.is_chat_registered === false) {
          toast.error("User belum terdaftar di chat workspace.");
          setSavingContact(false);
          return;
        }

        const { createContact } = await import("@/services/v1/contactService");
        await createContact({
          userId: userId,
          firstName: result.name || parsed.name,
          lastName: "",
          phone: parsed.phone,
          email: result.email || parsed.email || "",
          uid: result.user_id,
        });

        toast.success("Kontak berhasil disimpan.");
        await fetchContactsList();
      } catch (err: any) {
        console.error("Failed to save contact:", err);
        const errorMsg = err?.response?.data?.message || err?.message || "Gagal menyimpan kontak.";
        if (errorMsg.includes("already exists") || errorMsg.includes("sudah ada")) {
          toast.error("Kontak sudah ada sebelumnya");
        } else {
          toast.error(errorMsg);
        }
      } finally {
        setSavingContact(false);
      }
    };

    const API_URL = process.env.NEXT_PUBLIC_GATEWAY_API_URL_DEV;

    const getAttachmentUrl = (url: string) => {
      if (!url) return "";
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
      }
      return `${API_URL}${url}`;
    };

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
      try {
        const result = await deleteMessage(
          message.id,
          userId,
          message.conversation_id,
          isPermanent,
        );

        if (result?.status) {
          // Remove message from local state immediately
          const removeMessage = useChatStore.getState().removeMessage;
          removeMessage(message.conversation_id, message.id);

          toast.success(
            isPermanent
              ? "Message deleted for everyone"
              : "Message deleted for you",
          );
        } else {
          toast.error(result?.message || "Failed to delete message");
        }
      } catch (error) {
        console.error("Error deleting message:", error);
        toast.error("Failed to delete message");
      }
    };

    const handleReact = (emoji: string) => {
      if (!sendMessage) {
        toast.error("Tidak terhubung ke server chat.");
        return;
      }

      // Check if user already reacted with this exact emoji
      const existingReaction = reactions.find((r) => {
        const rId = r.userId || (r as any).user_id || r.user?.id;
        return rId === userId;
      });
      const isSameEmoji = existingReaction?.emoji === emoji;

      // If they clicked the same emoji, remove it (send empty content)
      // Otherwise, add/update with the new emoji
      const payload = {
        type: "reaction",
        conversation_id: message.conversation_id,
        message_id: message.id,
        content: isSameEmoji ? "" : emoji,
      };

      sendMessage(payload);
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
          userId,
        );
        if (result?.success || result?.data) {
          toast.success(
            `Message forwarded to ${conversationIds.length} conversation(s)`,
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
            newContent,
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
          newPinnedState,
        );
        if (result?.success || result?.data) {
          setIsPinned(newPinnedState);
          toast.success(newPinnedState ? "Message pinned" : "Message unpinned");
          if (onPinChange) {
            onPinChange();
          }
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

    const handleSenderClick = (e: React.MouseEvent) => {
      e.preventDefault();
      const targetUserId = message.sender?.id;
      if (!targetUserId) return;

      const foundContact = contacts?.find((c) => {
        const targetId = c.target?.id || (c as any).target_id || (c as any).TargetID;
        return targetId && targetId === targetUserId;
      });

      if (foundContact) {
        router.push(`/contact/${foundContact.id}`);
      } else {
        toast.error("Kontak tidak ditemukan di daftar kontak Anda.");
      }
    };

    const reactionGroups = reactions.reduce(
      (acc, reaction) => {
        if (!acc[reaction.emoji]) {
          acc[reaction.emoji] = [];
        }
        acc[reaction.emoji].push(reaction);
        return acc;
      },
      {} as Record<string, Reaction[]>,
    );

    const variants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    };

    useEffect(() => {
      if (message.reactions) {
        setReactions(message.reactions);
      }
    }, [message.reactions]);

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
          isCurrentUser ? "justify-end pl-10" : "justify-start pr-10",
        )}
      >
        {/* Avatar for received messages */}
        {!isCurrentUser && (
          <div className="flex-shrink-0 mr-2 self-start">
            <Avatar
              src={message.sender?.avatar_url || ""}
              name={getSenderName(message.sender)}
              size="sm"
            />
          </div>
        )}

        <div
          className={cn(
            "flex flex-col",
            isCurrentUser ? "items-end" : "items-start",
            "max-w-[80%]",
          )}
        >
          {/* Sender name */}
          {!isCurrentUser && message.sender && (
            <button
              onClick={handleSenderClick}
              className="flex items-center mb-1 hover:underline cursor-pointer text-left bg-transparent border-none p-0 focus:outline-none"
            >
              <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                {getSenderName(message.sender)}
              </span>
              <ChevronDown className="h-3 w-3 ml-1 text-gray-500" />
            </button>
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
                  : "bg-gray-200/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300",
              )}
            >
              <div className="flex items-center text-xs font-medium mb-1">
                <CornerUpLeft className="h-3 w-3 mr-1" />
                Replying to {getSenderName(parentMessage.sender)}
              </div>
              <div className="truncate text-sm">
                {parentMessage.content || "Message deleted"}
              </div>
            </motion.div>
          )}

          {/* Message bubble with dropdown */}
          <div className="relative" ref={dropdownRef}>
            {/* Image attachments rendered OUTSIDE DropdownMenuTrigger for direct click-to-preview */}
            {message.attachments && message.attachments.length > 0 && (() => {
              const imageAttachments = message.attachments.filter((a: any) => a.attachment_type === "image");
              if (imageAttachments.length === 0) return null;

              const allImages = imageAttachments.map((a: any) => ({
                url: getAttachmentUrl(a.file_url),
                fileName: a.file_name,
              }));

              const openGallery = (index: number) => {
                setImagePreview({ images: allImages, initialIndex: index });
              };

              const count = imageAttachments.length;
              const remaining = count - 4;

              return (
                <div className="pb-1 max-w-xs">

                  {count === 1 && (
                    /* Single image: full width */
                    <div className="relative group">
                      <img
                        src={allImages[0].url}
                        alt={allImages[0].fileName}
                        className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ maxHeight: "300px", objectFit: "contain" }}
                        onClick={() => openGallery(0)}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const link = document.createElement("a");
                          link.href = allImages[0].url;
                          link.download = allImages[0].fileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white p-2 rounded-full hover:bg-black/80"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {count === 2 && (
                    /* Two images: side by side */
                    <div className="grid grid-cols-2 gap-1">
                      {allImages.slice(0, 2).map((img, idx) => (
                        <div key={idx} className="relative group aspect-square">
                          <img
                            src={img.url}
                            alt={img.fileName}
                            className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => openGallery(idx)}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {count === 3 && (
                    /* Three images: 1 top full, 2 bottom */
                    <div className="space-y-1">
                      <div className="relative group">
                        <img
                          src={allImages[0].url}
                          alt={allImages[0].fileName}
                          className="w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ maxHeight: "200px", objectFit: "cover" }}
                          onClick={() => openGallery(0)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {allImages.slice(1, 3).map((img, idx) => (
                          <div key={idx} className="relative group aspect-square">
                            <img
                              src={img.url}
                              alt={img.fileName}
                              className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => openGallery(idx + 1)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {count >= 4 && (
                    /* 4+ images: 2x2 grid with +N overlay on 4th cell */
                    <div className="grid grid-cols-2 gap-1">
                      {allImages.slice(0, 4).map((img, idx) => (
                        <div key={idx} className="relative group aspect-square">
                          <img
                            src={img.url}
                            alt={img.fileName}
                            className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => openGallery(idx)}
                          />
                          {/* "+N" overlay on 4th image when there are more */}
                          {idx === 3 && remaining > 0 && (
                            <div
                              className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center cursor-pointer"
                              onClick={() => openGallery(3)}
                            >
                              <span className="text-white text-2xl font-bold">
                                +{remaining}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  ref={ref}
                  className={cn(
                    "px-4 py-3 cursor-pointer rounded-2xl",
                    isCurrentUser ? "rounded-tr-none" : "rounded-tl-none",
                    isVoiceCallMessage
                      ? "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
                      : isCurrentUser
                        ? "bg-blue-500 text-white"
                        : "bg-white dark:bg-gray-700",
                  )}
                >
                  {/* Display non-image attachments */}
                  {message.attachments && message.attachments.length > 0 && (() => {
                    const nonImageAttachments = message.attachments.filter((a: any) => a.attachment_type !== "image");
                    if (nonImageAttachments.length === 0) return null;
                    return (
                      <div className={cn("mb-2 space-y-2")}>
                        {nonImageAttachments.map((attachment: any) => (
                          <div key={attachment.id}>
                            {/* Non-image file attachment */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                const link = document.createElement("a");
                                link.href = getAttachmentUrl(attachment.file_url);
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
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                  {message.content && (
                    <div>
                      {message.content.startsWith("📞 Panggilan suara aktif") ? (
                        <div className="flex flex-col space-y-3 p-1">
                          <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <div className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </div>
                            <span className="text-sm">Panggilan Suara Aktif</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 break-words whitespace-pre-wrap">
                            {message.content}
                          </p>
                          {!isCurrentUser && (
                            <button
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const btn = document.getElementById("header-phone-button");
                                if (btn) {
                                  btn.click();
                                } else {
                                  toast.error("Tidak dapat menemukan tombol telepon di header.");
                                }
                              }}
                              className="w-full mt-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-medium text-sm transition-all duration-200 shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:-translate-y-0.5"
                            >
                              <Phone className="h-4 w-4 fill-current animate-pulse" />
                              <span>Gabung Panggilan</span>
                            </button>
                          )}
                        </div>
                      ) : message.content.startsWith("📞 Suara panggilan berakhir") || message.content.startsWith("📞 Panggilan suara berakhir") ? (
                        <div className="flex items-center space-x-3 p-1 text-gray-500 dark:text-gray-400 font-semibold">
                          <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          <span className="text-sm">Suara Panggilan Berakhir</span>
                        </div>
                      ) : message.content.startsWith("📹 Panggilan video aktif") ? (
                        <div className="flex flex-col space-y-3 p-1">
                          <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400 font-semibold">
                            <div className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </div>
                            <span className="text-sm">Panggilan Video Aktif</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 break-words whitespace-pre-wrap">
                            {message.content}
                          </p>
                          {!isCurrentUser && (
                            <button
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const btn = document.getElementById("header-video-button");
                                if (btn) {
                                  btn.click();
                                } else {
                                  toast.error("Tidak dapat menemukan tombol video di header.");
                                }
                              }}
                              className="w-full mt-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium text-sm transition-all duration-200 shadow-md shadow-blue-500/20 hover:shadow-blue-500/35 hover:-translate-y-0.5"
                            >
                              <Video className="h-4 w-4 fill-current animate-pulse" />
                              <span>Gabung Panggilan Video</span>
                            </button>
                          )}
                        </div>
                      ) : message.content.startsWith("📹 Video panggilan berakhir") ? (
                        <div className="flex items-center space-x-3 p-1 text-gray-500 dark:text-gray-400 font-semibold">
                          <Video className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                          <span className="text-sm">Video Panggilan Berakhir</span>
                        </div>
                      ) : message.content.includes("KARTU KONTAK") ? (
                        <div className="flex flex-col space-y-3 p-1">
                          <div className={cn(
                            "flex items-center space-x-2 font-semibold",
                            isCurrentUser ? "text-white" : "text-blue-600 dark:text-blue-400"
                          )}>
                            <div className={cn(
                              "p-1 rounded",
                              isCurrentUser ? "bg-white/20 text-white" : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                            )}>
                              <User className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-semibold tracking-wide uppercase">Kartu Kontak</span>
                          </div>
                          <div className="space-y-1.5 text-sm">
                            <p className={cn(
                              "font-semibold text-base",
                              isCurrentUser ? "text-white" : "text-gray-900 dark:text-white"
                            )}>
                              {(() => {
                                const parsed = parseContactCard(message.content);
                                return parsed.name;
                              })()}
                            </p>
                            {(() => {
                              const parsed = parseContactCard(message.content);
                              return (
                                <div className={cn(
                                  "space-y-1 text-xs",
                                  isCurrentUser ? "text-blue-100/90" : "text-gray-600 dark:text-gray-300"
                                )}>
                                  {parsed.phone && parsed.phone !== "-" && (
                                    <p className="flex items-center gap-1.5">
                                      <Phone className="h-3.5 w-3.5 opacity-80" />
                                      <span>{parsed.phone}</span>
                                    </p>
                                  )}
                                  {parsed.email && parsed.email !== "-" && (
                                    <p className="flex items-center gap-1.5">
                                      <Mail className="h-3.5 w-3.5 opacity-80" />
                                      <span>{parsed.email}</span>
                                    </p>
                                  )}
                                </div>
                              );
                            })()}
                            {!isCurrentUser && (
                              <div className="flex flex-col gap-2 mt-2">
                                <Button
                                  onPointerDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const parsed = parseContactCard(message.content);
                                    handleContactMessageClick(parsed.phone);
                                  }}
                                  disabled={loadingContactChat}
                                  className="w-full flex items-center justify-center space-x-2 py-1.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all duration-200 shadow-md border border-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-blue-500/10 dark:shadow-none"
                                >
                                  {loadingContactChat ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                                  ) : (
                                    <>
                                      <CornerUpLeft className="h-3.5 w-3.5 transform scale-x-[-1] fill-current" />
                                      <span>Kirim Pesan</span>
                                    </>
                                  )}
                                </Button>

                                <Button
                                  onPointerDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const parsed = parseContactCard(message.content);
                                    handleSaveContact(parsed);
                                  }}
                                  disabled={savingContact}
                                  className="w-full flex items-center justify-center space-x-2 py-1.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 font-semibold text-xs transition-all duration-200 border border-gray-200 dark:border-gray-600"
                                >
                                  {savingContact ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <UserPlus className="h-3.5 w-3.5" />
                                      <span>Simpan Kontak</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="break-words whitespace-pre-wrap">
                          {linkifyText(message.content)}
                        </p>
                      )}
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
                  onSelect={() => {
                    setIsEmojiPickerOpen(true);
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
              <div className={cn(
                "emoji-picker-wrapper absolute bottom-full mb-2 z-[100]",
                isCurrentUser ? "right-0" : "left-0"
              )}>
                <EmojiPicker
                  width={300}
                  height={350}
                  onEmojiClick={(emojiData: EmojiClickData) => {
                    handleReact(emojiData.emoji);
                    setIsEmojiPickerOpen(false);
                    document.dispatchEvent(
                      new KeyboardEvent("keydown", { key: "Escape" }),
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
            {Object.entries(reactionGroups).map(([emoji, reactors]) => {
              const hasUserReacted = reactors.some((r) => {
                const rId = r.userId || (r as any).user_id || r.user?.id;
                return rId === userId;
              });
              return (
                <Tooltip key={emoji}>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "text-sm rounded-full px-2 py-0.5 border flex items-center transition-colors hover:bg-gray-50 dark:hover:bg-gray-750",
                        hasUserReacted
                          ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                      )}
                      onClick={() => handleReact(emoji)}
                    >
                      <span className="text-base">{emoji}</span>
                      {reactors.length > 0 && (
                        <span className="text-xs ml-1 font-medium">{reactors.length}</span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <div className="space-y-1">
                      <p className="font-medium">{emoji} Reacted by:</p>
                      <div className="max-h-40 overflow-y-auto">
                        {reactors.map((reactor) => {
                          const rId = reactor.userId || (reactor as any).user_id || reactor.user?.id;
                          const rName = reactor.userName || (reactor as any).user_name || (reactor.user ? `${reactor.user.first_name || ""} ${reactor.user.last_name || ""}`.trim() : "") || "User";
                          const rAvatar = reactor.userAvatar || (reactor as any).user_avatar || reactor.user?.avatar_url;
                          return (
                            <div
                              key={rId}
                              className="flex items-center py-1"
                            >
                              <Avatar
                                src={rAvatar}
                                name={rName}
                                size="md"
                                className="mr-2"
                              />
                              <span>{rName}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatRelativeTime(message.created_at || "")}
            </p>
                {/* Read Status Indicator */}
                {isCurrentUser && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        {message.status === "failed" ? (
                          <button onClick={handleRetry}>
                            <RefreshCw className="h-3 w-3 text-red-500" />
                          </button>
                        ) : message.status === "pending" || message.status === "sending" ? (
                          <Clock className="h-3 w-3 text-gray-400" />
                        ) : message.read_at ? (
                          <CheckCheck className="h-3 w-3 text-blue-500" />
                        ) : (
                          <CheckCheck className="h-3 w-3 text-gray-400" />
                        )}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {message.status === "failed"
                          ? "Failed to send. Click to retry"
                          : message.status === "pending"
                          ? "Sending..."
                          : message.read_at
                          ? `Read at ${new Date(message.read_at).toLocaleTimeString()}`
                          : "Delivered"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
        </div>

        {/* Spacer */}
        {isCurrentUser && <div className="flex-shrink-0 ml-2 w-8 h-8 invisible" />}

        {/* Delete Confirmation Dialog */}
        <DeleteConfirmDialog
          open={openDeleteModal}
          isPermanent={permanentDelete}
          onConfirm={confirmDelete}
          onCancel={() => setOpenDeleteModal(false)}
          onTogglePermanent={setPermanentDelete}
          title="Delete Chat Message"
          description="Choose how you want to delete this message:"
          isMessageSender={isCurrentUser}
          isGroupConversation={isGroupConversation}
        />

        {/* Image Preview Modal */}
        {imagePreview && (
          <ImagePreviewModal
            open={!!imagePreview}
            onClose={() => setImagePreview(null)}
            images={imagePreview.images}
            initialIndex={imagePreview.initialIndex}
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
  },
);

MessageBubble.displayName = "MessageBubble";
