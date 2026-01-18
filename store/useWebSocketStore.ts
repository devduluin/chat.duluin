// store/useWebSocketStore.ts
import { create } from "zustand";

interface WebSocketStore {
  sendMessage: ((payload: string | object) => boolean) | null;
  isConnected: boolean;
  setSendMessage: (fn: ((payload: string | object) => boolean) | null) => void;
  setConnected: (connected: boolean) => void;
}

export const useWebSocketStore = create<WebSocketStore>((set) => ({
  sendMessage: null,
  isConnected: false,
  setSendMessage: (fn) => set({ sendMessage: fn }),
  setConnected: (connected) => set({ isConnected: connected }),
}));
