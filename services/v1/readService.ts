import apiClient from "../apiClient";

export const markConversationAsRead = async (
  conversationId: string,
  userId: string
) => {
  try {
    const response = await apiClient.post(
      `/v1/conversations/${conversationId}/read?user_id=${userId}`
    );
    return response.data;
  } catch (error) {
    console.error("Failed to mark conversation as read:", error);
    throw error;
  }
};
