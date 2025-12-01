// components/chat/MessageActions.tsx
"use client"

import { useState, useRef, useEffect } from 'react'
import { Reply, Trash2, SmilePlus, MoreHorizontal } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'
import { motion } from 'framer-motion'
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react'
import { cn } from '@/lib/utils'

interface MessageActionsProps {
  onReply: () => void
  onDelete: () => void
  onReact: (emoji: string) => void
  isCurrentUser: boolean
  isMobile?: boolean
}

export function MessageActions({ onReply, onDelete, onReact, isCurrentUser, isMobile = false }: MessageActionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onReact(emojiData.emoji)
    setShowEmojiPicker(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "flex items-center gap-1 bg-white dark:bg-gray-800 rounded-full p-1 shadow-sm border border-gray-200 dark:border-gray-700",
        isCurrentUser ? 'order-first mr-1' : 'order-last ml-1'
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button 
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={onReply}
          >
            <Reply className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Reply</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative" ref={emojiPickerRef}>
            <button 
              className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <SmilePlus className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 z-50 mb-2">
                <EmojiPicker 
                  width={300}
                  height={350}
                  onEmojiClick={handleEmojiClick}
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">React</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={(e) => e.stopPropagation()} // Prevent bubble click from interfering
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-40 p-1 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
          sideOffset={5}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement
            if (target.closest('.emoji-picker-react') || target.closest('.message-bubble')) {
              e.preventDefault()
            }
          }}
        >
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation()
              onReply()
            }} 
            className="px-3 py-2 rounded-lg text-sm cursor-pointer"
          >
            <Reply className="mr-2 h-4 w-4" />
            Reply
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }} 
            className="px-3 py-2 rounded-lg text-sm cursor-pointer text-red-600 dark:text-red-400"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  )
}