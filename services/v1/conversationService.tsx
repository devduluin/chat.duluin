import api from "../apiClient";

interface PyloadProps {
    page: number;
    is_favorite: boolean;
}

export async function getConversations(id: string, filter: PyloadProps): Promise<any | null> {
  try {
    const response = await api.get(`/v1/conversations`, { params: { user_id: id, ...filter } });
    return response.data;
  } catch (error:any) {
    return error?.response?.data;
  }
}

export async function createConversation(data: any): Promise<Response | null> {
  try {
    const response = await api.post(`/v1/conversations`, data);
    return response.data;
  } catch (error:any) {
    return error?.response?.data;
  }
}

export async function updateConversation(id: string, data: any): Promise<any | null> {
  try {
    const response = await api.put(`/v1/conversations/${id}`, data);
    return response.data;
    } catch (error:any) {
    return error?.response?.data;
    }
}
