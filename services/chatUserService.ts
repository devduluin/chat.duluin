import apiClient from "./apiClient";

export interface SyncUserRequest {
  id: string;
  secondary_id: string;
  email: string;
  name: string;
  phone: string;
}

export interface SyncUserResponse {
  status: boolean;
  message: string;
  data: {
    id: string;
    tenant_id: string;
    phone: string;
    email: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
    status: string;
    last_seen_at: string;
    user_type: string;
    contact_visibility: string;
    allow_contact_requests: boolean;
    auto_approve_contacts: boolean;
    created_at: string;
    updated_at: string;
  };
}

export async function syncUserToChatBackend(
  userData: SyncUserRequest
): Promise<SyncUserResponse | null> {
  try {
    const response = await apiClient.post("/users/sync", userData);
    return response.data;
  } catch (error: any) {
    console.error("Failed to sync user to chat backend:", error);
    return error?.response?.data;
  }
}

export async function getUserById(userId: string): Promise<any | null> {
  try {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  } catch (error: any) {
    console.error("Failed to get user:", error);
    return error?.response?.data;
  }
}

export async function updateUserStatus(
  userId: string,
  status: "online" | "offline"
): Promise<any | null> {
  try {
    const response = await apiClient.patch(`/users/${userId}/status`, {
      status,
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to update user status:", error);
    return error?.response?.data;
  }
}

export async function bulkSyncContacts(
  requesterID: string,
  contacts: any[]
): Promise<any | null> {
  try {
    const response = await apiClient.post("/users/bulk-sync-contacts", {
      requester_id: requesterID,
      contacts: contacts,
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to bulk sync contacts:", error);
    return error?.response?.data;
  }
}
