import api from "../apiClient";

interface PyloadProps {
    page: number;
    is_favorite: boolean;
}

export async function getContacts(id: string, filter: PyloadProps): Promise<ContactResponse | null> {
  try {
    const response = await api.get(`/v1/contacts`, { params: { user_id: id, ...filter } });
    return response.data;
  } catch (error:any) {
    return error?.response?.data;
  }
}

export async function searchContact(phone: string): Promise<any | null> {
  try {
    const response = await api.get(`/v1/contacts/search?phone=${phone}`);
    return response.data;
  } catch (error:any) {
    return error?.response?.data;
  }
}

export async function getContact(id: string): Promise<any | null> {
  try {
    const response = await api.get(`/v1/contacts/${id}`);
    return response.data;
  } catch (error:any) {
    return error?.response?.data;
  }
}

export async function createContact(data: any): Promise<Response | null> {
  try {
    const response = await api.post(`/v1/contacts`, data);
    return response.data;
  } catch (error:any) {
    return error?.response?.data;
  }
}

export async function updateContact(id: string, data: any): Promise<any | null> {
  try {
    const response = await api.put(`/v1/contacts/${id}`, data);
    return response.data;
    } catch (error:any) {
    return error?.response?.data;
    }
}

export async function deleteContact(id: string): Promise<any | null> {
  try {
    const response = await api.delete(`/v1/contacts/${id}`);
    return response.data;
  } catch (error:any) {
    return error?.response?.data;
  }
}
