// components/chat/ConversationItem.tsx
import Link from 'next/link'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { formatRelativeTime } from '@/utils/formatDate'

interface ConversationItemProps {
  conversation: ConversationDetails
  lastMessage: Message
}

export function ConversationItem({ conversation, lastMessage }: ConversationItemProps) {
  return (
    <Link 
      href={`/conversation/${conversation.id}`}
      className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
    >
      <div className="flex items-center space-x-3">
        <Avatar 
          src={conversation.avatar_url ?? lastMessage.sender.avatar_url} 
          name={conversation.name} 
          isOnline={true}
        />
        {lastMessage ? (
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {conversation.name}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatRelativeTime(lastMessage.created_at || '')}
              </span>
            </div>
            
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {lastMessage.content}
              </p>
              {/* Example unread badge - you might want to calculate this */}
              <Badge variant="default">3</Badge>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-w-0"> 
            <div className="flex justify-between items-center"> 
              <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {conversation.name}
              </h3>
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}