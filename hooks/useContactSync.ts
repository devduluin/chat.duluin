import { useState, useCallback } from "react";
import { getEmployeeContacts } from "@/services/employeeService";
// import { bulkSyncContacts } from "@/services/chatUserService";
import { useAppCookies } from "./useAppCookies";
import Cookies from "js-cookie";

export function useContactSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    success: boolean;
    message: string;
    syncedUsers?: number;
    createdContacts?: number;
  } | null>(null);
  const { appToken } = useAppCookies();

  const syncContactsFromHRIS = useCallback(
    async (customToken?: string) => {
      // NOTE: Contact sync is now handled by the backend asynchronously during login
      console.log("⚡ Contact sync is handled by backend. Skipping frontend sync.");
      return { success: true, message: "Sync handled by backend" };

      /*
      const token = customToken || appToken;

      console.log(
        "🔄 syncContactsFromHRIS called with token:",
        token ? "✓ Available" : "✗ Missing"
      );
      
      // ... (rest of the code commented out)
      */
    },
    [appToken]
  );
  
  return {
    syncContactsFromHRIS,
    isSyncing,
    syncStatus,
  };
}
