// components/chat/MessageBubble.tsx
"use client"

import { forwardRef, useState, useRef, useEffect } from 'react'
import { Avatar } from '../ui/avatar'
import { formatRelativeTime } from '@/utils/formatDate'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '../ui/dropdown-menu'
import { 
  Reply, 
  Trash2,
  ChevronDown,
  CornerUpLeft,
  CheckCheck,
  Check,
  SmilePlus
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { motion } from 'framer-motion'
import { DeleteConfirmDialog } from '@/components/alert/DeleteConfirmDialog'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'

interface Reaction {
  emoji: string
  userId: string
  userName: string
  userAvatar?: string
}

interface MessageBubbleProps {
  userId: string
  message: Message
  onReply?: (message: {
    id: string
    content: string
    sender: User
  }) => void
  parentMessage?: Message | null
  scrollToMessage?: (id: string) => void
}

export const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(
  ({ userId, message, onReply, parentMessage, scrollToMessage }, ref) => {
    const isCurrentUser = message.sender?.id === userId
    const [reactions, setReactions] = useState<Reaction[]>([])
    const [showReactors, setShowReactors] = useState(false)
    const [openDeleteModal, setOpenDeleteModal] = useState(false)
    const [permanentDelete, setPermanentDelete] = useState(true)
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const handleReply = () => {
      onReply?.({
        id: message.id,
        content: message.content,
        sender: message.sender
      })
    }

    const handleDelete = () => {
      setOpenDeleteModal(true)
    }

    const confirmDelete = async (isPermanent: boolean) => {
      setOpenDeleteModal(false)
      if (isPermanent) {
        console.log('Permanently deleting message:', message.id)
      } else {
        console.log('Soft deleting message:', message.id)
      }
    }

    const handleReact = (emoji: string) => {
      const newReaction = {
        emoji,
        userId: userId,
        userName: 'You',
        userAvatar: ''
      }
      setReactions(prev => [...prev, newReaction])
      setIsEmojiPickerOpen(false)
    }

    const handleParentMessageClick = () => {
      if (parentMessage && scrollToMessage) {
        scrollToMessage(parentMessage.id)
      }
    }

    const reactionGroups = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = []
      }
      acc[reaction.emoji].push(reaction)
      return acc
    }, {} as Record<string, Reaction[]>)

    const variants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (
          isEmojiPickerOpen &&
          dropdownRef.current &&
          !dropdownRef.current.contains(target) &&
          !target.closest('.emoji-picker-react')
        ) {
          setIsEmojiPickerOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
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
          isCurrentUser ? 'justify-end pl-10' : 'justify-start pr-10'
        )}
      >
        {/* Avatar for received messages */}
        {!isCurrentUser && (
          <div className="flex-shrink-0 mr-2 self-start">
            <Avatar 
              src={message.sender?.avatar_url || ''} 
              name={`${message.sender.first_name} ${message.sender.last_name}`} 
              size="sm" 
            />
          </div>
        )}

        <div className={cn(
          "flex flex-col",
          isCurrentUser ? 'items-end' : 'items-start',
          'max-w-[80%]'
        )}>
          {/* Sender name */}
          {!isCurrentUser && (
            <Link 
              href={`/conversation/${message.sender.email}`}
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
                  ? 'bg-blue-400/20 text-blue-700 dark:text-blue-300' 
                  : 'bg-gray-200/50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
              )}
            >
              <div className="flex items-center text-xs font-medium mb-1">
                <CornerUpLeft className="h-3 w-3 mr-1" />
                Replying to {parentMessage.sender.first_name} {parentMessage.sender.last_name}
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
                <div ref={ref} className={cn(
                  "rounded-2xl px-4 py-3 cursor-pointer",
                  isCurrentUser 
                    ? 'bg-blue-500 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-gray-700 rounded-tl-none'
                )}>
                  <p className="break-words">{message.content}</p>
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent 
                align={isCurrentUser ? 'end' : 'start'} 
                className="w-48 p-0"
                onInteractOutside={(e) => {
                  const target = e.target as HTMLElement
                  if (target.closest('.emoji-picker-react') || target.closest('.emoji-picker-wrapper')) {
                    e.preventDefault()
                  }
                }}
              >
                <DropdownMenuItem onClick={handleReply} className="px-4 py-2">
                  <Reply className="mr-2 h-4 w-4" />
                  Reply
                </DropdownMenuItem>
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
                    e.preventDefault()
                    setIsEmojiPickerOpen(!isEmojiPickerOpen)
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
                    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
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
                        <div key={reactor.userId} className="flex items-center py-1">
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
              {formatRelativeTime(message.created_at || '')}
            </p>
            {isCurrentUser && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    {message.read_at ? (
                      <CheckCheck className="h-3 w-3 text-blue-500" />
                    ) : (
                      <Check className="h-3 w-3 text-gray-400" />
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {message.read_at 
                    ? `Read at ${new Date(message.read_at).toLocaleString()}` 
                    : "Delivered"}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Spacer */}
        {isCurrentUser && <div className="flex-shrink-0 ml-2 w-8" />}
        <DeleteConfirmDialog
          open={openDeleteModal}
          isPermanent={permanentDelete}
          onConfirm={confirmDelete}
          onCancel={() => setOpenDeleteModal(false)}
          onTogglePermanent={setPermanentDelete}
          title="Delete Chat Message"
          description="Are you sure you want to delete this message?"
        />
      </motion.div>
    )
  }
)

MessageBubble.displayName = 'MessageBubble'