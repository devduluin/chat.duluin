import { logoutService } from "@/services/loginService";
import { clearAuthLocalStoragePreservingE2EE } from "@/lib/e2ee/storage-persistence";

/**
 * Utility function to perform logout with backend API call
 * Can be imported and used anywhere in the application
 */
export const performLogout = async (appToken?: string) => {
  // Call backend logout API if token exists
  if (appToken) {
    try {
      await logoutService({ appToken });
    } catch (apiError) {
      console.error("Backend logout error:", apiError);
      // Continue with local logout even if API call fails
    }
  }

  // Clear all cookies
  const cookies = document.cookie.split(";");

  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i];
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

    // Delete cookie for all possible paths and domains
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname}`;
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=.${window.location.hostname}`;
  }

  // Clear auth storage but preserve E2EE keys on this device.
  if (typeof window !== "undefined") {
    clearAuthLocalStoragePreservingE2EE();
    sessionStorage.clear();
  }
};

/**
 * Hook to handle logout with routing
 * Usage: const { logout } = useLogout();
 */
export const useLogout = () => {
  const logout = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/logout";
    }
  };

  return { logout };
};
