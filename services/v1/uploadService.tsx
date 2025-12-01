import api from "@/services/apiAuthClient";
import { fileToBase64 } from "@/utils/fileToBase64"; // wherever you saved it

export async function uploadFile(fileParam: string): Promise<any | null> {
  try { 

    const response = await api.post(`/users/public_file_blob_uploader`, {
      file: fileParam,
      folder: "forms",
    });

    return response.data;
  } catch (error: any) {
    return error?.response?.data;
  }
}

export async function deleteFile(fileParam: string): Promise<any | null> {
  try { 

    const response = await api.post(`/users/file_delete`, {
      filename: fileParam
    });

    return response.data;
  } catch (error: any) {
    return error?.response?.data;
  }
}