interface ContactResponse {
  status: boolean;
  message: string;
  data: ContactData[];
  meta: Meta;
}

interface ContactData {
  created_at: string;
  id: string;
  requester_id: string;
  target: Contact;
  updated_at: string;
  conversation_id: string; // Added for conversation ID
}

interface Contact {
  allow_contact_requests: boolean;
  auto_approve_contacts: boolean;
  avatar_url: string;
  contact_visibility: string; // e.g., "tenant_only"
  created_at: string;
  email: string;
  first_name: string;
  id: string;
  last_name: string;
  last_seen_at: string;
  status: string; // e.g., "offline"
  tenant_id: string;
  updated_at: string;
  user_type: string; // e.g., "human"
  is_online?: boolean; // Optional, for UI purposes
}

interface Meta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
