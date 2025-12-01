// hooks/useConversations.ts
"use client";

import { useEffect, useState } from 'react'

export function useConversations() {
  const [recent_conversations, setRecentConversations] = useState<
    { Conversation: any; LastMessage: any }[]
  >([]);
  const [last_conversation, setLastConversation] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Dummy data matching your response structure
        const dummyData = {
          status: "success",
          message: "Conversations retrieved",
          data: {
            last_conversation: {
              Conversation: {
                id: "c6bb5ef7-090b-4aca-8d86-44b03635342a",
                name: "Team Chat",
                avatar_url: "",
                is_group: true,
                is_cross_tenant: false,
                created_by: "02a7eb2c-3c71-4c7f-8dc8-716ddbd3f24f",
                created_at: "2025-07-14T13:54:08.633+07:00",
                updated_at: "2025-07-14T13:54:08.633+07:00",
                members: null,
                messages: null
              },
              LastMessage: {
                id: "fd114549-65f7-4a12-ad22-816dd8d6b360",
                conversation_id: "c6bb5ef7-090b-4aca-8d86-44b03635342a",
                sender_id: "0006234e-ec6d-4f4b-b175-ae3bc75c1cd7",
                content: "Ok",
                message_type: "text",
                metadata: null,
                parent_message_id: null,
                is_system_message: false,
                created_at: "2025-07-14T17:10:15.985+07:00",
                updated_at: "2025-07-14T17:10:15.985+07:00",
                sender: {
                  id: "0006234e-ec6d-4f4b-b175-ae3bc75c1cd7",
                  tenant_id: "ad10d5db-6079-11f0-a322-c4cb76b7e62b",
                  email: "jane@example.com",
                  first_name: "Jane",
                  last_name: "Doe",
                  avatar_url: "https://randomuser.me/api/portraits/women/44.jpg",
                  status: "online",
                  last_seen_at: new Date().toISOString(),
                  user_type: "member",
                  contact_visibility: "public",
                  allow_contact_requests: true,
                  auto_approve_contacts: false,
                  created_at: "2025-01-01T00:00:00Z",
                  updated_at: "2025-01-01T00:00:00Z",
                  settings: {
                    id: "00000000-0000-0000-0000-000000000000",
                    user_id: "0006234e-ec6d-4f4b-b175-ae3bc75c1cd7",
                    notification_prefs: null,
                    theme: "light",
                    language: "en",
                    created_at: "2025-01-01T00:00:00Z",
                    updated_at: "2025-01-01T00:00:00Z"
                  }
                },
                attachments: null
              }
            },
            recent_conversations: [
              {
                Conversation: {
                  id: "c6bb5ef7-090b-4aca-8d86-44b03635342v",
                  name: "AI",
                  avatar_url: "",
                  is_group: true,
                  is_cross_tenant: false,
                  created_by: "02a7eb2c-3c71-4c7f-8dc8-716ddbd3f24f",
                  created_at: "2025-07-14T13:54:08.633+07:00",
                  updated_at: "2025-07-14T13:54:08.633+07:00",
                  members: null,
                  messages: null
                },
                LastMessage: {
                  id: "fd114549-65f7-4a12-ad22-816dd8d6b360",
                  conversation_id: "c6bb5ef7-090b-4aca-8d86-44b03635342a",
                  sender_id: "0006234e-ec6d-4f4b-b175-ae3bc75c1cd7",
                  content: "Task created successfully",
                  message_type: "text",
                  metadata: null,
                  parent_message_id: null,
                  is_system_message: false,
                  created_at: "2025-07-14T17:10:15.985+07:00",
                  updated_at: "2025-07-14T17:10:15.985+07:00",
                  sender: {
                    id: "0006234e-ec6d-4f4b-b175-ae3bc75c1cd7",
                    tenant_id: "ad10d5db-6079-11f0-a322-c4cb76b7e62b",
                    email: "jane@example.com",
                    first_name: "Bot",
                    last_name: "Doe",
                    avatar_url: "https://randomuser.me/api/portraits/women/44.jpg",
                    status: "online",
                    last_seen_at: new Date().toISOString(),
                    user_type: "member",
                    contact_visibility: "public",
                    allow_contact_requests: true,
                    auto_approve_contacts: false,
                    created_at: "2025-01-01T00:00:00Z",
                    updated_at: "2025-01-01T00:00:00Z",
                    settings: {
                      id: "00000000-0000-0000-0000-000000000000",
                      user_id: "0006234e-ec6d-4f4b-b175-ae3bc75c1cd7",
                      notification_prefs: null,
                      theme: "light",
                      language: "en",
                      created_at: "2025-01-01T00:00:00Z",
                      updated_at: "2025-01-01T00:00:00Z"
                    }
                  },
                  attachments: null
                }
              },
              {
                Conversation: {
                  id: "c6bb5ef7-090b-4aca-8d86-44b03635342a",
                  name: "Team Chat",
                  avatar_url: "",
                  is_group: true,
                  is_cross_tenant: false,
                  created_by: "02a7eb2c-3c71-4c7f-8dc8-716ddbd3f24f",
                  created_at: "2025-07-14T13:54:08.633+07:00",
                  updated_at: "2025-07-14T13:54:08.633+07:00",
                  members: null,
                  messages: null
                },
                LastMessage: {
                  id: "fd114549-65f7-4a12-ad22-816dd8d6b360",
                  conversation_id: "c6bb5ef7-090b-4aca-8d86-44b03635342a",
                  sender_id: "0006234e-ec6d-4f4b-b175-ae3bc75c1cd7",
                  content: "Ok",
                  message_type: "text",
                  metadata: null,
                  parent_message_id: null,
                  is_system_message: false,
                  created_at: "2025-07-14T17:10:15.985+07:00",
                  updated_at: "2025-07-14T17:10:15.985+07:00",
                  sender: {
                    id: "0006234e-ec6d-4f4b-b175-ae3bc75c1cd7",
                    tenant_id: "ad10d5db-6079-11f0-a322-c4cb76b7e62b",
                    email: "jane@example.com",
                    first_name: "Jane",
                    last_name: "Doe",
                    avatar_url: "https://randomuser.me/api/portraits/women/44.jpg",
                    status: "online",
                    last_seen_at: new Date().toISOString(),
                    user_type: "member",
                    contact_visibility: "public",
                    allow_contact_requests: true,
                    auto_approve_contacts: false,
                    created_at: "2025-01-01T00:00:00Z",
                    updated_at: "2025-01-01T00:00:00Z",
                    settings: {
                      id: "00000000-0000-0000-0000-000000000000",
                      user_id: "0006234e-ec6d-4f4b-b175-ae3bc75c1cd7",
                      notification_prefs: null,
                      theme: "light",
                      language: "en",
                      created_at: "2025-01-01T00:00:00Z",
                      updated_at: "2025-01-01T00:00:00Z"
                    }
                  },
                  attachments: null
                }
              }
            ]
          }
        }

        setRecentConversations(dummyData.data.recent_conversations)
        setLastConversation(dummyData.data.last_conversation)
      } catch (error) {
        console.error('Failed to fetch conversations', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
  }, [])

  return { recent_conversations, last_conversation, loading }
}