import api from "../apiClient";
import { handleApiError } from "@/utils/handleApiError";

interface Response{
    data?: Question;
    message: string;
    success: boolean;
    status: string;
    meta?: Metadata;
}

interface Metadata {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

interface Question {
    id?: string;
    form_id?: string;
    type?: string;
    text?: string;
    is_required?: boolean;
    order?: number;
    placeholder?: string;
    help_text?: string;
    scale_min?: number;
    scale_max?: number;
    answer_option_id?: string;
    point?: number;
    options?: string[];
}

export async function getQuestions(form_id: string): Promise<any | null> {
  try {
    const response = await api.get(`/v1/forms/questions`, { params: { form_id, sortBy: "qorder", order: "ASC" } });
    return response.data;
  } catch (error:any) {
    return handleApiError(error);
  }
}

export async function createQuestion(data: Question): Promise<Response | null> {
  try {
    const response = await api.post(`/v1/forms/questions`, data);
    return response.data;
  } catch (error:any) {
    return handleApiError(error);
  }
}

export async function updateQuestion(data: Question, id: string): Promise<Response | null> {
  try {
    const response = await api.put(`/v1/forms/questions/${id}`, data);
    return response.data;
    } catch (error:any) {
    return handleApiError(error);
    }
}

export const updateOrderQuestion = async (id: string, payload: { id: string; order: number }[]) => {
  try {
    const response = await api.put(`/v1/forms/questions/order/${id}`, { orders: payload });
    return response.data;
  } catch (error:any) {
    return handleApiError(error);
  }
}

export async function deleteQuestion(id: string): Promise<Response | null> {
    try {
      const response = await api.delete(`/v1/forms/questions/${id}`);
      return response.data;
    } catch (error:any) {
      return handleApiError(error);
    }
}