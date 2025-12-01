import apiAuth from "./apiAuthClient";
import { useAppCookies } from '@/hooks/useAppCookies';

export async function validationToken(appToken: string) {
  try {
    const response = await apiAuth.get("/users/signin-cookies", 
      { headers: 
        { Authorization: `Bearer ${appToken}`,
          "Content-Type": "application/json",
          "X-Account-Type": "form_workspace",
         } 
      });
    const result = response.data;
    
    return result;
  } catch (error:any) {
    return error?.response;
  }
}
export async function getUserInfo(appToken: string) {
  try {
    const response = await apiAuth.get("/users", 
      { headers: 
        { Authorization: `Bearer ${appToken}`,
          "Content-Type": "application/json",
         } 
      });
    const result = response.data;
    
    return result;
  } catch (error:any) {
    return error?.response;
  }
}
export async function connectAccount(params: { appToken: string, email: string}) {
  try {
    const response = await apiAuth.post("/users/connect-account",
      {
        email: params.email
      },
      { headers: 
        { Authorization: `Bearer ${params.appToken}`,
          "Content-Type": "application/json",
          "X-Account-Type": "form_workspace",
         }
      });
    const result = response.data;
    
    return result;
  } catch (error: any) {
    return error?.response;
  }
}

export async function logoutService(params: { appToken: string }) {
  try {
    const response = await apiAuth.post(
      "/users/logout",
      {}, // no request body, or put payload here if needed
      {
        headers: {
          Authorization: `Bearer ${params.appToken}`,
          "Content-Type": "application/json",
          "X-Account-Type": "form_workspace",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Logout failed", error);
    throw error;
  }
}


export async function loginService(email: string, password: string) {
  try {
    const response = await apiAuth.post("/users/auth/signin", { email, password });
    const result = response.data;
    
    return result;
  } catch (error: any) {
    return error?.response?.data;
  }
}
export async function validateEmailAccount(email: string) {
  try {
    const response = await apiAuth.post("/users/auth/user-validation", 
      { 
        email 
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Account-Type": "form_workspace",
        },
      }
    );
    const result = response?.data;
    
    return result;
  } catch (error: any) {
    return error?.response;
  }
}