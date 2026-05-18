"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAppCookies } from "@/hooks/useAppCookies";
import { useAccountStore } from "@/store/useAccountStore";
import { validationToken } from "@/services/loginService";
import { syncUserToChatBackend } from "@/services/chatUserService";
import { showError, showSuccess } from "@/utils/alertHelper";
import Cookies from "js-cookie";

export function SSOAutoLogin() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { setAppToken } = useAppCookies();
  const { setData } = useAccountStore();
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const appToken = searchParams.get("app_token");
    if (!appToken || isProcessingRef.current) return;

    isProcessingRef.current = true;
    console.log("🔑 [SSOAutoLogin] Found app_token in URL query parameters, initiating authentication...");

    // Save token to cookie immediately
    setAppToken(appToken);

    const validate = async () => {
      try {
        const result = await validationToken(appToken);

        if (result?.success) {
          const user = result.user ?? {};
          const role = result.user.roles?.[0]?.name ?? "pro";

          setData({
            companyId: user.secondary_id ?? user.id,
            accountType: role === "Basic" ? "Basic" : "pro",
            formQuota: role === "Basic" ? 4 : 5,
            ...user,
          });

          // Store user info in cookies for contact sync & backend auth
          Cookies.set("user_id", user.id);
          Cookies.set("tenant_id", user.secondary_id ?? user.id);

          // Sync user to chat backend
          const syncData = {
            id: user.id,
            secondary_id: user.secondary_id ?? user.id,
            email: user.email,
            name: user.name,
            phone: user.phone || "",
          };

          syncUserToChatBackend(syncData).catch((error) => {
            console.error("Failed to sync user to chat backend:", error);
          });

          showSuccess(`Welcome back, ${user?.name || "User"}!`);

          // Clean the query parameters from URL without losing path
          const cleanUrl = new URL(window.location.href);
          const redirectPath = cleanUrl.searchParams.get("redirect") || "/";

          cleanUrl.searchParams.delete("app_token");
          cleanUrl.searchParams.delete("sso_user_id");
          cleanUrl.searchParams.delete("account_type");
          cleanUrl.searchParams.delete("redirect");

          if (pathname.startsWith("/auth/")) {
            router.replace(redirectPath);
          } else {
            router.replace(cleanUrl.pathname + cleanUrl.search);
          }
        } else {
          console.error("❌ [SSOAutoLogin] Token validation failed:", result);
          showError("SSO login session invalid or expired!");
          isProcessingRef.current = false;
        }
      } catch (error) {
        console.error("❌ [SSOAutoLogin] Error validating token:", error);
        showError("SSO login failed!");
        isProcessingRef.current = false;
      }
    };

    validate();
  }, [searchParams, setAppToken, setData, router, pathname]);

  return null;
}
