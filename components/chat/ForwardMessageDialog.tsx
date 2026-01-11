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
import { toast } from "sonner";

interface ForwardMessageDialogProps {
  open: boolean;
  onClose: () => void;
  message: Message;
  onForward?: (conversationIds: string[]) => void;
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

  const filteredConversations = conversations.filter((item) => {
    const displayName =
      (item as any).display_name || item.Conversation.name || "";
    return displayName.toLowerCase().includes(searchQuery.toLowerCase());
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
      toast.error("Please select at least one conversation");
      return;
    }

    onForward?.(selectedConversations);
    toast.success(
      `Message forwarded to ${selectedConversations.length} conversation(s)`
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
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Conversation List */}
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {filteredConversations.map((item) => {
              const displayName =
                (item as any).display_name || item.Conversation.name || "Chat";
              const displayAvatar =
                (item as any).display_avatar ||
                item.Conversation.avatar_url ||
                "";
              const isSelected = selectedConversations.includes(
                item.Conversation.id
              );

              return (
                <div
                  key={item.Conversation.id}
                  onClick={() => handleToggleConversation(item.Conversation.id)}
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
                  <Avatar src={displayAvatar} name={displayName} size="sm" />
                  <span className="text-sm font-medium flex-1">
                    {displayName}
                  </span>
                </div>
              );
            })}
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
