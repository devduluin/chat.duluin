import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_NODE_ENV === 'development'
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
        .find(row => row.startsWith("app_token="))
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
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
