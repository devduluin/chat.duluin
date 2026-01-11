import { useState, useCallback } from "react";
import { getEmployeeContacts } from "@/services/employeeService";
import { bulkSyncContacts } from "@/services/chatUserService";
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
      const token = customToken || appToken;

      console.log(
        "🔄 syncContactsFromHRIS called with token:",
        token ? "✓ Available" : "✗ Missing"
      );

      if (!token) {
        console.error("No auth token available");
        return { success: false, message: "No auth token" };
      }

      setIsSyncing(true);
      setSyncStatus(null);

      try {
        // Get user data from cookies
        const userId = Cookies.get("user_id");
        const tenantId =
          Cookies.get("tenant_id") || Cookies.get("secondary_id");

        console.log("📋 User info from cookies:", { userId, tenantId });

        if (!userId || !tenantId) {
          throw new Error("User ID or Tenant ID not found in session");
        }

        // 1. Fetch employee contacts from HRIS API
        console.log("Fetching employee contacts from HRIS...");
        const employeeResponse = await getEmployeeContacts({
          company_id: tenantId,
          token: token,
          page: 1,
          limit: 100,
          search: null,
        });

        console.log("📦 Employee response:", employeeResponse);

        if (!employeeResponse?.success) {
          const errorMsg =
            employeeResponse?.message || "Failed to fetch employee contacts";
          console.error("❌ Failed to fetch:", errorMsg);
          throw new Error(errorMsg);
        }

        // Response structure: { data: [...] } not { data: { data: [...] } }
        const employees = Array.isArray(employeeResponse?.data)
          ? employeeResponse.data
          : [];

        if (employees.length === 0) {
          console.warn("⚠️ No employees found");
          const result = {
            success: true,
            message: "No contacts to sync",
            syncedUsers: 0,
            createdContacts: 0,
          };
          setSyncStatus(result);
          setIsSyncing(false);
          return result;
        }

        console.log(`✅ Fetched ${employees.length} employee contacts`);

        // Filter employees with valid user_id
        const validEmployees = employees.filter(
          (emp: any) => emp.user_id != null
        );

        console.log(
          `📋 ${validEmployees.length} of ${employees.length} employees have user_id`
        );

        if (validEmployees.length === 0) {
          console.warn("⚠️ No employees with user_id found");
          const result = {
            success: true,
            message: "No contacts with user_id to sync",
            syncedUsers: 0,
            createdContacts: 0,
          };
          setSyncStatus(result);
          setIsSyncing(false);
          return result;
        }

        // 2. Transform employee data to user format
        const contactsData = validEmployees.map((emp: any) => ({
          id: emp.user_id,
          secondary_id: emp.company_id || tenantId,
          email:
            emp.addressContact?.personal_email ||
            `${emp.employee_id}@company.com`,
          name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
          phone: emp.addressContact?.mobile_phone || "",
        }));

        console.log(`📋 Transformed ${contactsData.length} contacts for sync`);

        // 3. Bulk sync to chat backend
        console.log("Syncing contacts to chat backend...");
        const syncResponse = await bulkSyncContacts(userId, contactsData);

        if (!syncResponse?.status) {
          throw new Error(syncResponse?.message || "Failed to sync contacts");
        }

        const result = {
          success: true,
          message: syncResponse.message,
          syncedUsers: syncResponse.data?.synced_users || 0,
          createdContacts: syncResponse.data?.created_contacts || 0,
        };

        setSyncStatus(result);
        console.log("Sync completed:", result);
        return result;
      } catch (error: any) {
        console.error("Contact sync error:", error);
        const result = {
          success: false,
          message: error.message || "Failed to sync contacts",
        };
        setSyncStatus(result);
        return result;
      } finally {
        setIsSyncing(false);
      }
    },
    [appToken]
  );

  return {
    syncContactsFromHRIS,
    isSyncing,
    syncStatus,
  };
}
