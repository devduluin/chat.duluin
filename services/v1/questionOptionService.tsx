import api from "../apiClient";
import { handleApiError } from "@/utils/handleApiError";

interface Option {
  id?: string;
  question_id: string;
  text: string;
  value?: string;
}

export async function getOption(question_id: string): Promise<any | null> {
  try {
    const response = await api.get(`/v1/forms/question_options`, { params: { question_id } });
    return response.data;
  } catch (error:any) {
    return handleApiError(error);
  }
}

export async function createOption(data: Option): Promise<any | null> {
  try {
    const response = await api.post(`/v1/forms/question_options`, data);
    return response.data;
  } catch (error:any) {
    return handleApiError(error);
  }
}
export async function updateOption(data: Option, id: string): Promise<any | null> {
  try {
    const response = await api.put(`/v1/forms/question_options/${id}`, data);
    return response.data;
  } catch (error:any) {
    return handleApiError(error);
  }
}

export async function deleteOption(id: string): Promise<Option | null> {
  try {
    const response = await api.delete(`/v1/forms/question_options/${id}`);
    return response.data;
  } catch (error:any) {
    return handleApiError(error);
  }
}

export async function saveAnswer(data: any, id: string): Promise<Option | null> {
  try {
    const response = await api.put(`/v1/forms/question_options/${id}`, data);
    return response.data;
  } catch (error:any) {
    return handleApiError(error);
  }
}