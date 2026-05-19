// components/chat/ForwardMessageDialog.tsx
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
import { Search, Send } from "lucide-react";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useContactsList } from "@/hooks/useContacts";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

interface ForwardMessageDialogProps {
  open: boolean;
  onClose: () => void;
  message: Message;
  onForward?: (conversationIds: string[]) => void;
}

interface TargetItem {
  id: string; // Active conversation ID or User ID (for new chats)
  name: string;
  avatar: string;
  isGroup: boolean;
  isContactOnly: boolean;
}

export function ForwardMessageDialog({
  open,
  onClose,
  message,
  onForward,
}: ForwardMessageDialogProps) {
  const [selectedConversations, setSelectedConversations] = useState<string[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const conversations = useConversationsStore((s) => s.conversations);
  const userId = useAuthStore((s) => s.user_id) || "";

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
  contacts.forEach((contact) => {
    const contactUserId = contact.target.id;

    // Check if there is already an active conversation with this user
    const hasConversation = conversations.some((conv) => {
      if (conv.Conversation.is_group) return false;
      const members = conv.Conversation.members || [];
      return members.some((m: any) => m.user_id === contactUserId);
    });

    // Also check if the contact's conversation_id field points to a conversation in our store
    const hasConvId =
      contact.conversation_id &&
      conversations.some(
        (conv) => conv.Conversation.id === contact.conversation_id
      );

    if (!hasConversation && !hasConvId) {
      mergedTargets.push({
        id: contactUserId, // We use their User UUID directly
        name: `${contact.target.first_name} ${contact.target.last_name}`,
        avatar: contact.target.avatar_url || "",
        isGroup: false,
        isContactOnly: true,
      });
    }
  });

  // Filter based on search query
  const filteredTargets = mergedTargets.filter((item) => {
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleToggleConversation = (conversationId: string) => {
    setSelectedConversations((prev) =>
      prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  const handleForward = () => {
    if (selectedConversations.length === 0) {
      toast.error("Please select at least one target");
      return;
    }

    onForward?.(selectedConversations);
    toast.success(
      `Message forwarded to ${selectedConversations.length} target(s)`
    );
    setSelectedConversations([]);
    onClose();
  };

  const handleClose = () => {
    setSelectedConversations([]);
    setSearchQuery("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Message Preview */}
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {message.content}
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations or contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Combined Target List */}
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {filteredTargets.length > 0 ? (
              filteredTargets.map((item) => {
                const isSelected = selectedConversations.includes(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleConversation(item.id)}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-500"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <Avatar src={item.avatar} name={item.name} size="sm" />
                    <div className="flex-1 min-w-0 text-left">
                      <span className="text-sm font-medium block truncate">
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
              <div className="py-4 text-center text-sm text-gray-500">
                No chats or contacts found
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            disabled={selectedConversations.length === 0}
          >
            <Send className="mr-2 h-4 w-4" />
            Forward ({selectedConversations.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
