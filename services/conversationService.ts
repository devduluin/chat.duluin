// services/conversationService.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export interface CreateConversationRequest {
  name: string;
  user_id: string;
  tenant_id: string;
  is_group: boolean;
  member_ids: string[];
}

export interface ConversationResponse {
  status: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    avatar_url: string;
    is_group: boolean;
    is_cross_tenant: boolean;
    created_by: string;
    created_at: string;
    updated_at: string;
  };
}

export const createConversation = async (
  data: CreateConversationRequest,
): Promise<ConversationResponse> => {
  const response = await fetch(`${API_URL}/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create conversation");
  }

  return response.json();
};
