"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useAccountStore } from "@/store/useAccountStore";
import { useAppCookies } from "@/hooks/useAppCookies";
import { logoutService } from "@/services/loginService";
import { Loader2 } from "lucide-react";

export default function LogoutHandler() {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { clearData } = useAccountStore();
  const { appToken, isInitialized } = useAppCookies();
  const hasLoggedOut = useRef(false);

  useEffect(() => {
    // Only run once and wait for cookies to be initialized
    if (hasLoggedOut.current || !isInitialized) return;

    hasLoggedOut.current = true;

    const performLogout = async () => {
      try {
        // Call backend logout API if token exists
        if (appToken) {
          try {
            await logoutService({ appToken });
          } catch (apiError) {
            console.error("Backend logout error:", apiError);
            // Continue with local logout even if API call fails
          }
        }

        // Clear auth store
        clearAuth();

        // Clear account store
        clearData();

        // Clear all cookies
        const cookies = document.cookie.split(";");

        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf("=");
          const name =
            eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();

          // Delete cookie for all possible paths and domains
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname}`;
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=.${window.location.hostname}`;
        }

        // Clear localStorage
        if (typeof window !== "undefined") {
          localStorage.clear();
          sessionStorage.clear();
        }

        // Small delay to ensure everything is cleared
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Redirect to signin page
        router.push("/auth/signin");
      } catch (error) {
        console.error("Logout error:", error);
        // Still redirect even if there's an error
        router.push("/auth/signin");
      }
    };

    performLogout();
  }, [isInitialized, appToken, clearAuth, clearData, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Logging out...
        </h2>
        <p className="text-gray-600">Please wait while we sign you out</p>
      </div>
    </div>
  );
}
