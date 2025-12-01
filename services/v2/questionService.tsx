import api from "../apiClient";
import { handleApiError } from "@/utils/handleApiError";
import {Question} from "@/lib/question";

interface Response{
    data: Question;
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


export async function getQuestions(form_id: string, page?: number): Promise<any | null> {
  try {
    const response = await api.get(`/v2/forms/questions/client`, { params: 
      { form_id, 
        sortBy: "qorder",
        order: "ASC",
        page: page || 1,
      } 
    });
    return response.data;
  } catch (error:any) {
    return handleApiError(error);
  }
}