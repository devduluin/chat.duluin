// services/v1/messageService.tsx
import api from "../apiClient";

/**
 * Send a message to a conversation
 */
export async function sendMessage(payload: {
  conversation_id: string;
  sender_id: string;
  tenant_id: string;
  content: string;
  message_type?: string;
  parent_message_id?: string;
  attachment_ids?: string[];
}): Promise<any | null> {
  try {
    const response = await api.post(`/messages`, payload);
    return response.data;
  } catch (error: any) {
    console.error("Error sending message:", error);
    throw error;
  }
}

/**
 * Forward a message to multiple conversations
 */
export async function forwardMessage(
  messageId: string,
  conversationIds: string[],
  userId: string
): Promise<any | null> {
  try {
    const response = await api.post(`/messages/${messageId}/forward`, {
      conversation_ids: conversationIds,
      user_id: userId,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error forwarding message:", error);
    return error?.response?.data;
  }
}

/**
 * Edit a message content
 */
export async function editMessage(
  messageId: string,
  userId: string,
  content: string
): Promise<any | null> {
  try {
    const response = await api.put(`/messages/${messageId}`, {
      user_id: userId,
      content: content,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error editing message:", error);
    return error?.response?.data;
  }
}

/**
 * Pin or unpin a message
 */
export async function pinMessage(
  messageId: string,
  conversationId: string,
  userId: string,
  isPinned: boolean
): Promise<any | null> {
  try {
    const response = await api.post(`/messages/${messageId}/pin`, {
      conversation_id: conversationId,
      user_id: userId,
      is_pinned: isPinned,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error pinning message:", error);
    return error?.response?.data;
  }
}

/**
 * Get all pinned messages in a conversation
 */
export async function getPinnedMessages(
  conversationId: string
): Promise<any | null> {
  try {
    const response = await api.get(`/messages/${conversationId}/pinned`);
    return response.data;
  } catch (error: any) {
    console.error("Error getting pinned messages:", error);
    return error?.response?.data;
  }
}
