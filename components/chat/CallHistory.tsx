// components/chat/CallHistory.tsx
"use client"

import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CallHistoryProps {
  calls: Array<{
    id: string
    type: 'voice' | 'video'
    direction: 'incoming' | 'outgoing' | 'missed'
    duration: string
    date: string
    timestamp: string
  }>
}

export function CallHistory({ calls }: CallHistoryProps) {
  return (
    <div className="space-y-2 pt-2">
      {calls.map((call) => (
        <div 
          key={call.id} 
          className={cn(
            "flex items-center justify-between p-3 rounded-lg",
            "hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          )}
        >
          <div className="flex items-center space-x-3">
            {call.type === 'video' ? (
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50">
                <Video className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            ) : call.direction === 'missed' ? (
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/50">
                <PhoneMissed className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
            ) : call.direction === 'incoming' ? (
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
                <PhoneIncoming className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50">
                <PhoneOutgoing className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            <div>
              <p className="font-medium">
                {call.type === 'video' ? 'Video Call' : 'Voice Call'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {call.direction === 'missed' 
                  ? 'Missed call' 
                  : call.direction === 'incoming' 
                    ? 'Incoming call' 
                    : 'Outgoing call'} • {call.date}
              </p>
            </div>
          </div>
          <p className="text-sm font-medium">{call.duration}</p>
        </div>
      ))}
    </div>
  )
}