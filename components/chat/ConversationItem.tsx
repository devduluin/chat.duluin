// components/chat/ConversationItem.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { formatRelativeTime } from "@/utils/formatDate";
import { linkifyTextToPlainPreview } from "@/utils/linkify";
import {
  getE2EEMessagePreview,
  resolveMessageForDisplay,
} from "@/lib/e2ee/message-preview";
import { useConversationsStore } from "@/store/useConversationsStore";

interface ConversationItemProps {
  conversation: ConversationDetails;
  lastMessage: Message;
  userId: string;
}

export function ConversationItem({
  conversation,
  lastMessage,
  userId,
}: ConversationItemProps) {
  const displayName =
    (conversation as any).display_name || conversation.name || "Chat";

  const displayAvatar =
    (conversation as any).display_avatar ||
    conversation.avatar_url ||
    "";

  const unreadCount = (conversation as any).unread_count || 0;

  const [previewContent, setPreviewContent] = useState(() =>
    getE2EEMessagePreview(lastMessage, userId),
  );

  useEffect(() => {
    const initial = getE2EEMessagePreview(lastMessage, userId);
    setPreviewContent(initial);

    if (!userId || lastMessage?.message_type !== "e2ee_text") {
      setPreviewContent(lastMessage?.content ?? "");
      return;
    }

    let cancelled = false;
    resolveMessageForDisplay(lastMessage, userId, {
      existingPlaintext: initial,
    })
      .then((resolved) => {
        if (cancelled) return;
        setPreviewContent(resolved.content);
        if (resolved.content !== lastMessage.content) {
          useConversationsStore
            .getState()
            .setMessage(conversation.id, resolved, userId);
        }
      })
      .catch((error) => {
        console.warn("Failed to resolve E2EE preview:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [conversation.id, lastMessage, userId]);

  return (
    <Link
      href={`/conversation/${conversation.id}`}
      className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      <div className="flex items-center space-x-3">
        <Avatar
          src={displayAvatar}
          name={displayName}
          status={conversation.status}
          isOnline={conversation.status === "online"}
        />
        {lastMessage ? (
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {displayName}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatRelativeTime(lastMessage.created_at || "")}
              </span>
            </div>

            <div className="flex justify-between items-center mt-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {linkifyTextToPlainPreview(previewContent, 40)}
              </p>
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {unreadCount}
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {displayName}
              </h3>
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
