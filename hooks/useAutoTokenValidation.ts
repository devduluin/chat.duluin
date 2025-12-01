import { useEffect, useState } from "react";
import { validationToken } from "@/services/loginService";
import { showError, showSuccess } from "@/utils/alertHelper";

/**
 * Hook for validating an app token and updating user data.
 */
export function useAutoTokenValidation({
  appToken,
  data,
  companyId,
  setData,
  clearData,
}: {
  appToken?: string | null;
  data: any;
  companyId?: string | null;
  setData: (data: any) => void;
  clearData: () => void;
}) {
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const validate = async () => {
      if (!appToken) {
        clearData();
        setIsValidating(false);
        return;
      }

      if (data?.email) {
        setIsValidating(false);
        return;
      }

      try {
        const result = await validationToken(appToken);

        if (result?.success) {
          const user = result.user ?? {};
          const role = result.user.roles[0]?.name;

          setData({
            companyId,
            accountType: role === "Basic" ? "Basic" : "pro",
            formQuota: role === "Basic" ? 4 : 5,
            ...user,
          });

          showSuccess(`Welcome back, ${user?.name || "User"}!`);
        }else if(result.status === 301){
            clearData();
            if(result?.data?.allowed_register === true){
              const currentUrl = window.location.href;
              window.location.href = `/auth/connect?redirect=${encodeURIComponent(currentUrl)}`
            }
        }
      } catch (error) {
        showError("Session expired or invalid token!");
        document.cookie =
          "app_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      } finally {
        setIsValidating(false);
      }
    };

    if (appToken && (!data || !data.companyId)) {
      validate();
    } else {
      setIsValidating(false);
    }
  }, [appToken, data, companyId, setData, clearData]);

  return { isValidating };
}
