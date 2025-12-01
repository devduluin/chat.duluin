// lib/Conversation.ts

interface UserSettings {
  id: string
  user_id: string
  notification_prefs: any | null
  theme: string
  language: string
  created_at: string
  updated_at: string
}

interface ConversationMember {
  id: string
  conversation_id: string
  user_id: string
  tenant_id: string
  role: string
  joined_at: string
  user: User
}

interface Conversation {
  id: string
  name: string
  avatar_url: string
  is_group: boolean
  is_cross_tenant: boolean
  created_by: string
  created_at: string
  updated_at: string
  members: ConversationMember[]
  messages: any[] | null
}

interface RecentConversation {
  Conversation: ConversationDetails;
  LastMessage: Message;
}

interface ConversationDetails {
  id: string;
  name: string;
  avatar_url: string;
  is_group: boolean;
  is_cross_tenant: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  members: any | null;    // You can replace `any` with `Member[]` if known
  messages: any | null;   // You can replace `any` with `Message[]` if needed
}

interface LastMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  metadata: any | null;
  parent_message_id: string | null;
  is_system_message: boolean;
  created_at: string;
  updated_at: string;
  sender: User;
  attachments: any | null; // Update with proper type if available
}

interface UserSettings {
  id: string;
  user_id: string;
  notification_prefs: any | null;
  theme: string;
  language: string;
  created_at: string;
  updated_at: string;
}

