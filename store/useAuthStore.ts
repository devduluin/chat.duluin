import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  name: string | null;
  email: string | null;
  token: string | null;
  sso_token: string | null;
  user_id: string | null;
  is_verified?: number | null;
  expires_at?: string | null;
  setAuth: (response: LoginResponse) => void;
  clearAuth: () => void;
}

// Define the expected shape of the login response
interface LoginResponse {
  message: string;
  access_token: string;
  sso_token: string;
  token_type: string;
  is_verified: number;
  expires_at: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      name: null,
      email: null,
      token: null,
      sso_token: null,
      secondary_id: null,
      user_id: null,
      is_verified: null,
      expires_at: null,

      setAuth: (res: LoginResponse) =>
        set({
          name: res.user.name,
          email: res.user.email,
          token: res.access_token,
          sso_token: res.sso_token,
          user_id: res.user.id,
          is_verified: res.is_verified,
          expires_at: res.expires_at,
        }),

      clearAuth: () =>
        set({
          name: null,
          email: null,
          token: null,
          sso_token: null,
          user_id: null,
          is_verified: null,
          expires_at: null,
        }),
    }),
    {
      name: "auth-storage",
    }
  )
);
