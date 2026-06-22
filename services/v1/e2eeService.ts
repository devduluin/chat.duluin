import api from "../apiClient";
import type { PreKeyBundle, RegisterDevicePayload } from "@/lib/e2ee/types";

export async function registerDevice(payload: RegisterDevicePayload) {
  const response = await api.post("/e2ee/devices", payload);
  return response.data;
}

export async function getUserKeyBundles(userId: string, deviceId?: string): Promise<PreKeyBundle[]> {
  const response = await api.get(`/e2ee/users/${userId}/bundle`, {
    params: deviceId ? { device_id: deviceId } : undefined,
  });
  return response.data?.data ?? [];
}

export async function listDevices(userId: string) {
  const response = await api.get("/e2ee/devices", { params: { user_id: userId } });
  return response.data?.data ?? [];
}

export async function enableConversationE2EE(conversationId: string, userId: string) {
  const response = await api.post(`/conversations/${conversationId}/enable-e2ee`, {
    user_id: userId,
  });
  return response.data;
}
