import api from "../apiClient";

interface PyloadProps {
  page: number;
  is_favorite: boolean;
}

export async function getConversations(
  id: string,
  filter: PyloadProps
): Promise<any | null> {
  try {
    const response = await api.get(`/conversations`, {
      params: { user_id: id, ...filter },
    });
    return response.data;
  } catch (error: any) {
    return error?.response?.data;
  }
}

export async function createConversation(data: any): Promise<Response | null> {
  try {
    const response = await api.post(`/conversations`, data);
    return response.data;
  } catch (error: any) {
    return error?.response?.data;
  }
}

export async function updateConversation(
  id: string,
  data: any
): Promise<any | null> {
  try {
    const response = await api.put(`/conversations/${id}`, data);
    return response.data;
  } catch (error: any) {
    return error?.response?.data;
  }
}

export async function getConversationById(
  conversationId: string,
  userId: string
): Promise<any | null> {
  try {
    const response = await api.get(`/conversations/${conversationId}`, {
      params: { user_id: userId },
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch conversation:", error);
    return error?.response?.data;
  }
}
