export type SecurityMode = "plain" | "e2ee";

export interface E2EEMetadata {
  v: number;
  suite: string;
  sender_device_id: string;
  sender_registration_id: number;
  device_messages?: Array<{
    device_id: string;
    ciphertext: string;
  }>;
}

export interface PreKeyBundle {
  user_id: string;
  device_id: string;
  identity_pub: string;
  signed_prekey_id: number;
  signed_prekey_pub: string;
  signed_prekey_sig: string;
  registration_id: number;
  prekey_id?: number;
  prekey_pub?: string;
}

export interface RegisterDevicePayload {
  user_id: string;
  device_id: string;
  device_name: string;
  platform: "web" | "ios" | "android";
  identity_pub: string;
  signed_prekey_id: number;
  signed_prekey_pub: string;
  signed_prekey_sig: string;
  registration_id: number;
  one_time_prekeys: Array<{ prekey_id: number; prekey_pub: string }>;
}

export interface E2EEReadiness {
  self_device_ready: boolean;
  recipient_device_ready: boolean;
  recipient_user_id?: string;
  can_send_encrypted: boolean;
}

export interface EnableE2EEResponse {
  conversation: Conversation;
  e2ee_readiness: E2EEReadiness;
}
