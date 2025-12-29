// components/chat/ConversationItem.tsx
import Link from "next/link";
import { Avatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { formatRelativeTime } from "@/utils/formatDate";

interface ConversationItemProps {
  conversation: ConversationDetails;
  lastMessage: Message;
}

export function ConversationItem({
  conversation,
  lastMessage,
}: ConversationItemProps) {
  // Display name dari API backend (sudah di-compute dengan benar di backend)
  // Untuk 1-on-1 chat: display_name = nama user lawan (bukan sender dari last message)
  // Untuk group chat: display_name = conversation.name
  const displayName =
    (conversation as any).display_name || conversation.name || "Chat";

  const displayAvatar =
    (conversation as any).display_avatar ||
    conversation.avatar_url ||
    lastMessage?.sender?.avatar_url;

  const unreadCount = (conversation as any).unread_count || 0;

  return (
    <Link
      href={`/conversation/${conversation.id}`}
      className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      <div className="flex items-center space-x-3">
        <Avatar src={displayAvatar} name={displayName} isOnline={true} />
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
                {lastMessage.content}
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
