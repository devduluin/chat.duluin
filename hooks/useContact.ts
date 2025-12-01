// hooks/useContact.ts
"use client"

import { useEffect, useState } from 'react'

interface Contact {
  id: string
  name: string
  avatar_url: string | null
  email: string
  phone: string
  status: string
  last_seen?: string
  is_online: boolean
  department?: string
  position?: string
}

interface CallHistory {
  id: string
  type: 'voice' | 'video'
  direction: 'incoming' | 'outgoing' | 'missed'
  duration: string
  date: string
  timestamp: string
}

export function useContact(contactId: string) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [callHistory, setCallHistory] = useState<CallHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchContactData = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Dummy data
        const dummyContact: Contact = {
          id: contactId,
          name: "John Doe",
          avatar_url: "https://randomuser.me/api/portraits/men/32.jpg",
          email: "john.doe@example.com",
          phone: "+1 (555) 123-4567",
          status: "Available",
          is_online: true,
          department: "Engineering",
          position: "Senior Developer",
          last_seen: new Date().toISOString()
        }

        const dummyCallHistory: CallHistory[] = [
          {
            id: "call-1",
            type: "voice",
            direction: "incoming",
            duration: "5:32",
            date: "Today",
            timestamp: new Date().toISOString()
          },
          {
            id: "call-2",
            type: "video",
            direction: "outgoing",
            duration: "12:45",
            date: "Yesterday",
            timestamp: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: "call-3",
            type: "voice",
            direction: "missed",
            duration: "0:00",
            date: "Monday",
            timestamp: new Date(Date.now() - 172800000).toISOString()
          }
        ]

        setContact(dummyContact)
        setCallHistory(dummyCallHistory)
      } catch (error) {
        console.error('Failed to fetch contact data', error)
      } finally {
        setLoading(false)
      }
    }

    fetchContactData()
  }, [contactId])

  return { contact, callHistory, loading }
}