// components/chat/PinnedMessagesBar.tsx
"use client";

import { useState } from "react";
import { Pin, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PinnedMessagesModal } from "./PinnedMessagesModal";

interface PinnedMessagesBarProps {
  pinnedMessages: Message[];
  onMessageClick: (messageId: string) => void;
  onRefresh: () => void;
}

export const PinnedMessagesBar = ({
  pinnedMessages,
  onMessageClick,
  onRefresh,
}: PinnedMessagesBarProps) => {
  const [showModal, setShowModal] = useState(false);

  if (pinnedMessages.length === 0) return null;

  const latestPinned = pinnedMessages[0];
  const hasMultiple = pinnedMessages.length > 1;

  return (
    <>
      <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-2">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2 flex-1 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded p-2 -ml-2 transition-colors"
            onClick={() => {
              if (hasMultiple) {
                setShowModal(true);
              } else {
                onMessageClick(latestPinned.id);
              }
            }}
          >
            <Pin className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                {hasMultiple
                  ? `${pinnedMessages.length} Pinned Messages`
                  : "Pinned Message"}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 truncate">
                {latestPinned.sender?.first_name}{" "}
                {latestPinned.sender?.last_name}: {latestPinned.content}
              </p>
            </div>
            {hasMultiple && (
              <ChevronRight className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <PinnedMessagesModal
          pinnedMessages={pinnedMessages}
          onClose={() => setShowModal(false)}
          onMessageClick={(messageId: string) => {
            setShowModal(false);
            onMessageClick(messageId);
          }}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
};
