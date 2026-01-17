// components/chat/PinnedMessagesModal.tsx
"use client";

import { X, Pin } from "lucide-react";
import { formatRelativeTime } from "@/utils/formatDate";
import { Avatar } from "../ui/avatar";
import { cn } from "@/lib/utils";

interface PinnedMessagesModalProps {
  pinnedMessages: Message[];
  onClose: () => void;
  onMessageClick: (messageId: string) => void;
  onRefresh: () => void;
}

export const PinnedMessagesModal = ({
  pinnedMessages,
  onClose,
  onMessageClick,
  onRefresh,
}: PinnedMessagesModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Pin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pinned Messages ({pinnedMessages.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {pinnedMessages.map((message) => (
            <div
              key={message.id}
              onClick={() => onMessageClick(message.id)}
              className={cn(
                "p-4 rounded-lg border cursor-pointer transition-all",
                "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600",
                "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar
                  src={message.sender?.avatar_url || ""}
                  name={`${message.sender?.first_name || "User"} ${
                    message.sender?.last_name || ""
                  }`}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-gray-900 dark:text-white">
                      {message.sender?.first_name} {message.sender?.last_name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(message.created_at || "")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                    {message.content}
                  </p>
                  {message.parent_message_id && (
                    <div className="mt-2 pl-3 border-l-2 border-gray-300 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        Reply to a message
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            Click on any message to jump to it in the conversation
          </p>
        </div>
      </div>
    </div>
  );
};
