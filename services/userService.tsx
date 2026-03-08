import apiAuth from "./apiAuthClient";

export async function searchUser(phone: string): Promise<any | null> {
  try {
    const response = await apiAuth.get(`/users/search-user?phone=${phone}`);
    return response.data;
  } catch (error:any) {
    return error?.response?.data;
  }
}

export async function findContact(contact: string): Promise<any | null> {
  try {
    const response = await apiAuth.get(`/users/user/find-contact?phone=${contact}`);
    return response.data;
  } catch (error: any) {
    return error?.response?.data;
  }
}

