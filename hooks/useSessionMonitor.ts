import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { showWarning } from "@/utils/alertHelper";

/**
 * Hook to monitor session expiration and auto logout
 * Checks token expiration every minute and 5 minutes before expiry shows warning
 */
export function useSessionMonitor() {
  const { expires_at, token, clearAuth } = useAuthStore();
  const router = useRouter();
  const warningShownRef = useRef(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback(() => {
    clearAuth();
    // Clear cookies
    document.cookie =
      "app_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    localStorage.removeItem("auth-storage");
    localStorage.removeItem("account-store");

    // Redirect to login
    showWarning("Session expired. Please login again.");
    router.push("/auth/login");
  }, [clearAuth, router]);

  const checkExpiration = useCallback(() => {
    if (!expires_at || !token) return;

    const expiryTime = new Date(expires_at).getTime();
    const now = Date.now();
    const timeLeft = expiryTime - now;

    // If expired, logout immediately
    if (timeLeft <= 0) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      handleLogout();
      return;
    }

    // Show warning 5 minutes before expiry
    const fiveMinutes = 5 * 60 * 1000;
    if (timeLeft <= fiveMinutes && !warningShownRef.current) {
      const minutesLeft = Math.floor(timeLeft / 60000);
      showWarning(
        `Your session will expire in ${minutesLeft} minute${
          minutesLeft !== 1 ? "s" : ""
        }. Please save your work.`
      );
      warningShownRef.current = true;
    }
  }, [expires_at, token, handleLogout]);

  useEffect(() => {
    if (!token || !expires_at) return;

    // Check immediately on mount
    checkExpiration();

    // Then check every minute
    checkIntervalRef.current = setInterval(checkExpiration, 60000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [token, expires_at, checkExpiration]);

  return { handleLogout };
}
