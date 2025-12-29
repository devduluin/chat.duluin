import axios from "axios";
import { useAuthStore } from "@/store/useAuthStore";

const apiAuth = axios.create({
  baseURL: process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔹 Request Interceptor: Attach Authorization Token
apiAuth.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const { token } = useAuthStore.getState(); // Zustand token management
      // const token = document.cookie
      //   .split("; ")
      //   .find(row => row.startsWith("authToken="))
      //   ?.split("=")[1];

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiAuth.interceptors.response.use(
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

        console.log("Session expired, redirecting to login");
        if (
          window.location.pathname !== "/" &&
          !window.location.pathname.startsWith("/auth/")
        ) {
          window.location.href = "/auth/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiAuth;
