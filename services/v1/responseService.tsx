import api from "../apiClient";

interface payLoadAnswer {
    email: string;
    form_id: string;
    answers: {
        question_id: string;
        answer: string;
    }[];
}

export async function getAllResponse(form_id: string): Promise<any | null> {
  try {
    const response = await api.get(`/v1/forms/response`, { params: { form_id } });
    return response.data;
  } catch (error:any) {
    return error?.response?.data;
  }
}

export async function countByFormId(form_id: string): Promise<any | null> {
  try {
    const response = await api.get(`/v1/forms/response/countByFormId`, { params: { form_id } });
    return response.data;
  } catch (error:any) {
    return error?.response?.data;
  }
}

export async function getOneResponse(formId: string, responseId: string): Promise<any | null> {
  try {
    const response = await api.get(`/v1/forms/response/${formId}/${responseId}`);
    return response.data;
  } catch (error:any) {
    return error?.response?.data;
  }
}

export async function deleteResponse(responseId: string): Promise<any | null> {
  try {
    await api.delete(`/v1/forms/response/${responseId}`);
    return null;
  } catch (error:any) {
    return error?.response?.data;
  }
}

export async function createAnswer(data: payLoadAnswer): Promise<any | null> {
  try {
    const response = await api.post(`/v2/forms/response`, data);
    return response.data;
  } catch (error:any) {
    return error?.response?.data;
  }
}
