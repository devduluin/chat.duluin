interface Member {
  id: string;
  conversation_id: string;
  user_id: string;
  tenant_id: string;
  role: "admin" | "member" | string;
  joined_at: string;
  user: User;
}

interface User {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  status: string;
  last_seen_at: string;
  user_type: string;
  contact_visibility: string;
  allow_contact_requests: boolean;
  auto_approve_contacts: boolean;
  created_at: string;
  updated_at: string;
  settings?: {
    id: string;
    user_id: string;
    notification_prefs: null;
    theme: string;
    language: string;
    created_at: string;
    updated_at: string;
  };
}

interface Attachment {
  id: string;
  message_id?: string | null;
  attachment_type: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url?: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  uploader?: User;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type?: string;
  metadata?: null;
  parent_message_id?: string | null;
  is_system_message?: boolean;
  created_at?: string;
  updated_at?: string;
  sender: User;
  attachments?: Attachment[] | null;
  read_at?: any | null;
  status?: "pending" | "sent" | "failed";
}

interface ChatStore {
  conversations: Record<string, Conversation>;
  members: Record<string, Member[]>;
  messages: Record<string, Message[]>;

  addMessage: (conversationId: string, msg: Message) => void;
  setMessages: (conversationId: string, msgs: Message[]) => void;
  updateMessageStatus: (
    id: string,
    conversationId: string,
    status: "sent" | "pending"
  ) => void;
  updateMessageReadStatus: (
    id: string,
    conversationId: string,
    read_at: Date | null
  ) => void;

  setMembers: (conversationId: string, members: Member[]) => void;

  setConversation: (conversationId: string, conversation: Conversation) => void;
  updateConversation: (
    conversationId: string,
    newDetails: Partial<Conversation>
  ) => void;
}
