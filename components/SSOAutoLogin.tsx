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
  const { appToken, setAppToken } = useAppCookies();
  const { data: accountData, setData } = useAccountStore();
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const urlAppToken = searchParams.get("app_token");
    const urlSsoUserId = searchParams.get("sso_user_id");

    const hasUrlParams = !!urlAppToken || !!urlSsoUserId;
    const isStoreEmpty = !accountData || !accountData.email;
    const tokenToUse = urlAppToken || appToken;

    if (!tokenToUse) {
      // If we don't have a token, but we have URL parameters (like sso_user_id),
      // we clean the URL to prevent it from getting stuck on launchpad redirect params
      if (hasUrlParams && !isProcessingRef.current) {
        console.log("🧹 [SSOAutoLogin] No token found but URL parameters present, cleaning URL...");
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("app_token");
        cleanUrl.searchParams.delete("sso_user_id");
        cleanUrl.searchParams.delete("account_type");
        cleanUrl.searchParams.delete("redirect");
        router.replace(cleanUrl.pathname + cleanUrl.search);
      }
      return;
    }

    // Only proceed to validate if:
    // 1. We have new URL parameters to process
    // 2. Or we have a token but our local Zustand store is completely empty
    if (!hasUrlParams && !isStoreEmpty) {
      return;
    }

    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    console.log("🔑 [SSOAutoLogin] Initiating token validation...", {
      source: urlAppToken ? "URL" : "Cookie",
      hasUrlParams,
      isStoreEmpty,
    });

    // Save token to cookie immediately if it came from URL
    if (urlAppToken) {
      setAppToken(urlAppToken);
    }

    const validate = async () => {
      try {
        const result = await validationToken(tokenToUse);

        if (result?.success) {
          const user = result.user ?? {};
          const accounts = user.accounts ?? {};
          const hasHrisEmployee = !!accounts.hris_employee;
          const hasHrisCompany = !!accounts.hris_company || !!accounts.hris_companies;
          const isAccountsEmpty = Object.keys(accounts).length === 0;

          if (isAccountsEmpty || !hasHrisEmployee || !hasHrisCompany) {
            console.error("❌ [SSOAutoLogin] Blocked login: Missing HRIS employee or company association.");
            showError("Akses ditolak: Akun Anda harus terasosiasi dengan data karyawan dan perusahaan HRIS aktif.");
            
            // Clear credentials
            setAppToken(null);
            setData(null);
            Cookies.remove("user_id");
            Cookies.remove("tenant_id");
            Cookies.remove("app_token");
            
            isProcessingRef.current = false;
            
            // Clean the query parameters from URL and redirect to login page
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete("app_token");
            cleanUrl.searchParams.delete("sso_user_id");
            cleanUrl.searchParams.delete("account_type");
            cleanUrl.searchParams.delete("redirect");
            router.replace("/auth/signin");
            return;
          }

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

          // Clean the query parameters from URL
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
  }, [searchParams, appToken, setAppToken, accountData, setData, router, pathname]);

  return null;
}
