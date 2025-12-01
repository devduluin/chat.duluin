"use client";
import { useAuthStore } from "../store/useAuthStore";

export default function Logout() {
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const handleLogout = () => {
    document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=" + window.location.hostname;
    clearAuth(); // Clear Zustand store
    window.location.href = "/auth/login";
  };

  return (
    <button onClick={handleLogout} className="p-2 bg-red-500 text-white rounded">
      Logout
    </button>
  );
}
