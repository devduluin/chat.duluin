import api from "@/services/apiClient";

export interface VideoCallTokenReq {
  chat_id: string;
  user_id: string;
  user_name: string;
}

export interface VideoCallTokenResp {
  livekit_url: string;
  token: string;
  room: string;
  participant: {
    user_id: string;
    user_name: string;
    role: string;
  };
  expires_at: number;
  ice_servers: { urls: any; username?: string; credential?: string }[];
  reconnect_ms: number;
}

export const videoCallService = {
  getLiveKitToken: async (data: VideoCallTokenReq): Promise<VideoCallTokenResp> => {
    const response = await api.post("/video-call/token", data);
    return response.data.data;
  },
};
