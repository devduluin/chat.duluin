import api from "../apiClient";

export async function getForm(id: string): Promise<any | null> {
  try {
    const response = await api.get(`/v2/forms/forms/${id}`);
    return response.data;
  } catch (error:any) {
    return error?.response?.data;
  }
}
