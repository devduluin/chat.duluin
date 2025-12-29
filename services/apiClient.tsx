import axios from "axios";
import { useAuthStore } from "@/store/useAuthStore";

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_GATEWAY_API_URL_DEV
      : process.env.NEXT_PUBLIC_GATEWAY_API_URL_PROD,
  headers: {
    "Content-Type": "application/json",
    "X-Account-Type": "form_workspace",
  },
});

// 🔹 Request Interceptor: Attach Authorization Token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      //  const { token } = useAuthStore.getState(); // Zustand token management
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("app_token="))
        ?.split("=")[1];

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      if (typeof window !== "undefined") {
        // Clear authentication state
        const { clearAuth } = useAuthStore.getState();
        clearAuth();

        // Clear cookies and storage
        document.cookie =
          "app_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        localStorage.removeItem("auth-storage");
        localStorage.removeItem("account-store");

        // Redirect to login only if not already there
        if (
          window.location.pathname !== "/" &&
          window.location.pathname !== "/auth/login"
        ) {
          window.location.href = "/auth/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
