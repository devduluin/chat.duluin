import api from "../apiClient";
import { handleApiError } from "@/utils/handleApiError";

interface PyloadProps {
    page: number;
    is_favorite: boolean;
}

interface Response{
    data?: FormDataProps;
    message: string;
    status: string;
    success: boolean;
    meta?: Metadata;
}

interface Metadata {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

interface FormDataProps {
  id?: string;
  company_id?: string;
  title?: string;
  description?: string;
  status?: 'draft' | 'published' | 'archived';
  time_out?: number;
  disallow_multiple_responses?: boolean;
  random_order?: boolean;
  is_favorite?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

interface publishDataProps {
  status: string;
  publish_status: "public" | "private";
  emails?: string[] | undefined;
}

export async function getForms(company_id: string, filter: PyloadProps): Promise<any | null> {
  try {
    const response = await api.get(`/v1/forms/forms`, { params: { company_id, ...filter } });
    return response.data;
  } catch (error:any) {
    return handleApiError(error);
  }
}

export async function getForm(id: string): Promise<any | null> {
  try {
    const response = await api.get(`/v1/forms/forms/${id}`);
    return response.data;
  } catch (error:any) {
    return handleApiError(error);
  }
}

export async function createForm(data: FormDataProps): Promise<Response | null> {
  try {
    const response = await api.post(`/v1/forms/forms`, data);
    return response.data;
  } catch (error:any) {
    return handleApiError(error);
  }
}
export async function createTemplateForm(data: any): Promise<Response | null> {
  try {
    const response = await api.post(`/v1/forms/forms/import-template`, data);
    return response.data;
  } catch (error:any) {
    return handleApiError(error);
  }
}

export async function updateForm(data: FormDataProps, id: string): Promise<Response | null> {
  try {
    const response = await api.put(`/v1/forms/forms/${id}`, data);
    return response.data;
    } catch (error:any) {
    return handleApiError(error);
    }
}

export async function publishForm(data: publishDataProps, id: string): Promise<Response | null> {
  try {
    const response = await api.put(`/v1/forms/forms/publish/${id}`, data);
    return response.data;
    } catch (error:any) {
    return handleApiError(error);
    }
}

export async function deleteForm(id: string): Promise<Response | null> {
    try {
      const response = await api.delete(`/v1/forms/forms/${id}`);
      return response.data;
    } catch (error:any) {
      return handleApiError(error);
    }
}

export async function hardDeleteForm(id: string): Promise<Response | null> {
    try {
      const response = await api.delete(`/v1/forms/forms/permanently/${id}`);
      return response.data;
    } catch (error:any) {
      return handleApiError(error);
    }
}