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
    console.error("getConversations error:", error);
    return null;
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

export async function clearConversationHistory(
  conversationId: string,
  userId: string
): Promise<any | null> {
  try {
    const response = await api.post(`/conversations/${conversationId}/clear`, null, {
      params: { user_id: userId },
    });
    return response.data;
  } catch (error: any) {
    return error?.response?.data;
  }
}

export async function addMemberToConversation(
  conversationId: string,
  userIds: string[],
  tenantId: string
): Promise<any | null> {
  try {
    // Use the new bulk add endpoint
    const response = await api.post(
      `/conversations/${conversationId}/members`,
      {
        user_ids: userIds,
        tenant_id: tenantId,
      }
    );
    return response.data;
  } catch (error: any) {
    console.error("Failed to add members:", error);
    console.error("Error details:", error?.response?.data);
    return {
      status: false,
      message: error?.response?.data?.message || "Failed to add members",
      errors: error?.response?.data?.errors || [error.message],
    };
  }
}

export async function removeMemberFromConversation(
  conversationId: string,
  userId: string,
  removerId: string
): Promise<any | null> {
  try {
    const response = await api.delete(
      `/conversations/${conversationId}/members/${userId}/remover/${removerId}`
    );
    return { status: true, data: response.data };
  } catch (error: any) {
    console.error("Failed to remove member:", error);
    console.error("Error details:", error?.response?.data);
    return {
      status: false,
      message: error?.response?.data?.message || "Failed to remove member",
      errors: error?.response?.data?.errors || [error.message],
    };
  }
}
