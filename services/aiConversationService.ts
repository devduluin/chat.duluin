// services/aiConversationService.ts
import Cookies from "js-cookie";

const API_BASE_URL = process.env.NEXT_PUBLIC_NLP_GATEWAY_URL;

export interface AIConversation {
  id: string;
  name: string;
  avatar_url: string;
  is_group: boolean;
  is_cross_tenant: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  updated_at: string;
  sender?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
}

/**
 * Get or create AI conversation for current user
 */
export async function getOrCreateAIConversation(): Promise<AIConversation | null> {
  try {
    const userId = Cookies.get("user_id");
    const tenantId = Cookies.get("tenant_id");

    if (!userId || !tenantId) {
      console.error("User ID or Tenant ID not found in cookies");
      return null;
    }

    const response = await fetch(
      `${API_BASE_URL}/ai-conversation?user_id=${userId}&tenant_id=${tenantId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Cookies.get("app_token")}`,
        },
        credentials: "include",
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error:", response.status, errorText);
      throw new Error(`Failed to get AI conversation: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result || !result.data) {
      console.error("Invalid response format:", result);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error("Failed to get or create AI conversation:", error);
    return null;
  }
}

/**
 * Save message to AI conversation
 */
export async function saveAIMessage(
  conversationId: string,
  senderId: string,
  content: string,
  messageType: string = "text",
): Promise<AIMessage | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai-conversation/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Cookies.get("app_token")}`,
      },
      credentials: "include",
      body: JSON.stringify({
        conversation_id: conversationId,
        sender_id: senderId,
        content: content,
        message_type: messageType,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Save message error:", response.status, errorText);
      throw new Error(`Failed to save message: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result || !result.data) {
      console.error("Invalid save message response:", result);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error("Failed to save AI message:", error);
    return null;
  }
}

/**
 * Get AI conversation messages with pagination
 */
export async function getAIConversationMessages(
  conversationId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<{ messages: AIMessage[]; total: number } | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/ai-conversation/messages?conversation_id=${conversationId}&limit=${limit}&offset=${offset}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Cookies.get("app_token")}`,
        },
        credentials: "include",
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Get messages error:", response.status, errorText);
      throw new Error(`Failed to get messages: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result || !result.data) {
      console.error("Invalid get messages response:", result);
      return null;
    }

    return {
      messages: result.data.messages,
      total: result.data.total,
    };
  } catch (error) {
    console.error("Failed to get AI conversation messages:", error);
    return null;
  }
}
