import api from "@/services/apiClient";

export interface VoiceCallTokenReq {
  chat_id: string;
  user_id: string;
  user_name: string;
}

export interface VoiceCallTokenResp {
  livekit_url: string;
  token: string;
  room: string;
  participant: {
    user_id: string;
    user_name: string;
    role: string;
  };
  expires_at: number;
  ice_servers: { urls: string }[];
  reconnect_ms: number;
}

export const voiceCallService = {
  getLiveKitToken: async (data: VoiceCallTokenReq): Promise<VoiceCallTokenResp> => {
    const response = await api.post("/voice-call/token", data);
    return response.data.data;
  },
};
