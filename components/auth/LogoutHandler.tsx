"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useAccountStore } from "@/store/useAccountStore";
import { useAppCookies } from "@/hooks/useAppCookies";
import { logoutService } from "@/services/loginService";
import { Loader2, LayoutDashboard } from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

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
    <div
      className="fixed inset-0 w-full h-full bg-gray-50"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        margin: 0,
        padding: 0,
      }}
    >
      {/* Top Left Logo */}
      <div className="absolute top-6 left-6 flex flex-col gap-1 z-10">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-blue-600" />
          <span className="text-sm font-semibold text-gray-700">
            Duluin Workspace
          </span>
        </div>
        <span className="text-xs text-gray-500 ml-8">
          Everything you need tools
        </span>
      </div>

      {/* Centered Content */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Card with gradient top border */}
          <Card className="relative overflow-hidden border border-gray-200 shadow-sm bg-white rounded-lg">
            {/* Gradient top border */}
            <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500" />

            <div className="p-8 space-y-6">
              {/* Logo centered */}
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <LayoutDashboard className="h-8 w-8 text-white" />
                </div>
              </div>

              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Logging out...
                  </h2>
                  <p className="text-sm text-gray-500">
                    Please wait while we sign you out
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
