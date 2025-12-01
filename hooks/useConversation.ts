// hooks/useConversation.ts
"use client"

import { useEffect, useState } from 'react'

interface Conversation {
  id: string
  name: string
  email: string
  avatar_url: string | null
  is_group: boolean
  created_at: string
  updated_at: string
}

export function useConversation(conversationId: string) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Dummy data
        const dummyData = {
          id: conversationId,
          name: "Team Chat",
          email: "testing@mail.com",
          avatar_url: "",
          is_group: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        setConversation(dummyData)
      } catch (error) {
        console.error('Failed to fetch conversation', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversation()
  }, [conversationId])

  return { conversation, loading }
}