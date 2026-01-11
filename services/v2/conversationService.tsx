import api from "../apiClient";

interface PyloadProps {
  page: number;
  is_favorite: boolean;
}

// export async function getConversations(id: string): Promise<any | null> {
//   try {
//     const response = await api.get(`/v1/conversations?user_id=${id}`);
//     return response.data;
//   } catch (error:any) {
//     return error?.response?.data;
//   }
// }

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
