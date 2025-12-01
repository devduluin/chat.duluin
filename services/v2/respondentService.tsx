import api from "../apiClient";

interface payLoadAnswer {
    email: string;
    form_id: string;
    answers: {
        question_id: string;
        answer: string;
    }[];
}

export async function createAnswer(data: payLoadAnswer): Promise<any | null> {
  try {
    const response = await api.post(`/v2/forms/response`, data);
    return response.data;
  } catch (error:any) {
    return error?.response?.data;
  }
}
