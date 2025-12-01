import axios from "axios";
// import { useAuthStore } from "@/store/useAuthStore";

const api = axios.create({
  baseURL: 'https://duluin.com/api',
  headers: { 
    "Content-Type": "application/json",
  },
});

// 🔹 Request Interceptor: Attach Authorization Token
api.interceptors.request.use(
  (config) => {
    // if (typeof window !== "undefined") {
    //   const { token } = useAuthStore.getState(); // Zustand token management
    //   if (token) {
    //     config.headers.Authorization = `Bearer ${token}`;
    //   }
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
