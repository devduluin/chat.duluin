import api from "../apiClient";
import { handleApiError } from "@/utils/handleApiError";

interface Response{
    data?: FormAccessProps;
    message: string;
    status: string;
    meta?: Metadata;
}

interface Metadata {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

interface FormAccessProps {
  id?: string;
  form_id?: string;
  email?: string;
  role?: 'respondent' | 'collaborator';
  created_at?: Date;
  updated_at?: Date;
}

export async function getFormAccess(form_id: string): Promise<any | null> {
  try {
    const response = await api.get(`/v1/forms/form-access`, { params: { form_id, sortBy: "created_at", order: "asc" } });
    return response.data;
  } catch (error:any) {
    return handleApiError(error);
  }
}

export async function checkFormAccess(email: string, id: string): Promise<any | null> {
  try {
    const response = await api.get(`/v1/forms/form-access/email/${id}`,{ params: { email } });
    return response.data;
  } catch (error:any) {
    return error?.response?.data;
  }
}

export async function createFormAccess(data: FormAccessProps): Promise<Response | null> {
  try {
    const response = await api.post(`/v1/forms/form-access`, data);
    return response.data;
  } catch (error:any) {
    return handleApiError(error);
  }
}

export async function deleteFormAccess(formId: string, email: string): Promise<Response | null> {
    try {
      const response = await api.delete(`/v1/forms/form-access/email/${formId}`,{ params: { email } });
      return response.data;
    } catch (error:any) {
      return handleApiError(error);
    }
}