// components/chat/ShareContactDialog.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Search, Send, User } from "lucide-react";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useContactsList } from "@/hooks/useContacts";
import { sendMessage, sendDirectMessage } from "@/services/v1/messageService";
import { toast } from "sonner";

interface ShareContactDialogProps {
  open: boolean;
  onClose: () => void;
  contactToShare: any;
  userId: string;
  tenantId: string;
}

interface TargetItem {
  id: string; // Active conversation ID or User ID (for new chats)
  name: string;
  avatar: string;
  isGroup: boolean;
  isContactOnly: boolean;
}

export function ShareContactDialog({
  open,
  onClose,
  contactToShare,
  userId,
  tenantId,
}: ShareContactDialogProps) {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const conversations = useConversationsStore((s) => s.conversations);

  // Fetch contacts dynamically when dialog is opened
  const { contacts, fetchContactsList } = useContactsList(userId, {
    page: 1,
    is_favorite: false,
  });

  useEffect(() => {
    if (open && userId) {
      fetchContactsList();
    }
  }, [open, userId, fetchContactsList]);

  // Build unified list of target items
  const mergedTargets: TargetItem[] = [];

  // 1. Add all active conversations first
  conversations.forEach((item) => {
    const displayName =
      (item as any).display_name || item.Conversation.name || "Chat";
    const displayAvatar =
      (item as any).display_avatar || item.Conversation.avatar_url || "";
    mergedTargets.push({
      id: item.Conversation.id,
      name: displayName,
      avatar: displayAvatar,
      isGroup: item.Conversation.is_group,
      isContactOnly: false,
    });
  });

  // 2. Add contacts that do not have an active conversation yet
  contacts.forEach((c) => {
    const contactUserId = c.target.id;

    // Check if there is already an active conversation with this user
    const hasConversation = conversations.some((conv) => {
      if (conv.Conversation.is_group) return false;
      const members = conv.Conversation.members || [];
      return members.some((m: any) => m.user_id === contactUserId);
    });

    // Also check if the contact's conversation_id field points to a conversation in our store
    const hasConvId =
      c.conversation_id &&
      conversations.some(
        (conv) => conv.Conversation.id === c.conversation_id
      );

    if (!hasConversation && !hasConvId) {
      mergedTargets.push({
        id: contactUserId, // We use their User UUID directly
        name: `${c.target.first_name || ""} ${c.target.last_name || ""}`.trim() || "Unknown",
        avatar: c.target.avatar_url || "",
        isGroup: false,
        isContactOnly: true,
      });
    }
  });

  // Filter based on search query
  const filteredTargets = mergedTargets.filter((item) => {
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleToggleTarget = (targetId: string) => {
    setSelectedTargets((prev) =>
      prev.includes(targetId)
        ? prev.filter((id) => id !== targetId)
        : [...prev, targetId]
    );
  };

  const handleShare = async () => {
    if (selectedTargets.length === 0) {
      toast.error("Please select at least one target");
      return;
    }

    if (!contactToShare) return;

    const contactName = contactToShare.name || (contactToShare.target ? `${contactToShare.target.first_name || ""} ${contactToShare.target.last_name || ""}`.trim() : "") || "Unknown Contact";
    const contactEmail = contactToShare.email || contactToShare.target?.email || "-";
    const contactPhone = contactToShare.phone || contactToShare.target?.phone || "-";

    const shareContent = `👤 KARTU KONTAK\nNama: ${contactName}\nTelepon: ${contactPhone}\nEmail: ${contactEmail}`;

    let successCount = 0;
    let failCount = 0;

    toast.loading("Sharing contact...", { id: "share-contact" });

    for (const targetId of selectedTargets) {
      const target = mergedTargets.find((t) => t.id === targetId);
      try {
        if (target?.isContactOnly) {
          // If contact only, send direct message (creates conversation automatically)
          await sendDirectMessage({
            recipient_id: targetId,
            sender_id: userId,
            tenant_id: tenantId || userId,
            content: shareContent,
            message_type: "text",
          });
        } else {
          // If active conversation, send standard message
          await sendMessage({
            conversation_id: targetId,
            sender_id: userId,
            tenant_id: tenantId || userId,
            content: shareContent,
            message_type: "text",
          });
        }
        successCount++;
      } catch (err) {
        console.error(`Failed to share contact to target ${targetId}:`, err);
        failCount++;
      }
    }

    toast.dismiss("share-contact");

    if (successCount > 0) {
      toast.success(`Contact shared successfully to ${successCount} target(s)`);
    }
    if (failCount > 0) {
      toast.error(`Failed to share contact to ${failCount} target(s)`);
    }

    setSelectedTargets([]);
    onClose();
  };

  const handleClose = () => {
    setSelectedTargets([]);
    setSearchQuery("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl dark:bg-gray-850 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Share Contact</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Contact Preview Card */}
          {contactToShare && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100/70 dark:border-gray-800/40 flex items-center space-x-3">
              <Avatar
                src={contactToShare.avatar_url || contactToShare.target?.avatar_url || ""}
                name={contactToShare.name || (contactToShare.target ? `${contactToShare.target.first_name || ""} ${contactToShare.target.last_name || ""}`.trim() : "") || "Contact"}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white truncate">
                  {contactToShare.name || (contactToShare.target ? `${contactToShare.target.first_name || ""} ${contactToShare.target.last_name || ""}`.trim() : "") || "Unknown Contact"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {contactToShare.email || contactToShare.target?.email || "-"}
                </p>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations or contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>

          {/* Target List */}
          <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1">
            {filteredTargets.length > 0 ? (
              filteredTargets.map((item) => {
                const isSelected = selectedTargets.includes(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleTarget(item.id)}
                    className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50"
                        : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <Avatar src={item.avatar} name={item.name} size="sm" className="h-8 w-8" />
                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-sm font-semibold block truncate text-gray-900 dark:text-white">
                        {item.name}
                      </span>
                      {item.isContactOnly && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 block">
                          Contact (new chat)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No chats or contacts found
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-gray-100 dark:border-gray-800/80">
          <Button variant="ghost" onClick={handleClose} className="rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={selectedTargets.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            <Send className="mr-2 h-4 w-4" />
            Share ({selectedTargets.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
