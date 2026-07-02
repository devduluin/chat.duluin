import { create } from "zustand";
import type { CallType } from "@/lib/callSignaling";

export interface IncomingCall {
  callId: string;
  callerId: string;
  callerName?: string;
  callType: CallType;
  conversationId: string;
}

export interface OutgoingCall {
  callId?: string;
  receiverId: string;
  callType: CallType;
  conversationId: string;
  answered: boolean;
}

export interface PendingRespond {
  callType: CallType;
  peerId: string;
  callId: string;
}

interface CallStore {
  incomingCall: IncomingCall | null;
  outgoingCall: OutgoingCall | null;
  pendingRespond: PendingRespond | null;
  endCallSignal: number;
  setIncomingCall: (call: IncomingCall | null) => void;
  setOutgoingCall: (call: OutgoingCall | null) => void;
  setOutgoingCallId: (callId: string) => void;
  markOutgoingAnswered: () => void;
  setPendingRespond: (pending: PendingRespond | null) => void;
  clearIncomingCall: () => void;
  clearOutgoingCall: () => void;
  clearAll: () => void;
  signalEndCall: () => void;
  resetEndCallSignal: () => void;
}

export const useCallStore = create<CallStore>((set) => ({
  incomingCall: null,
  outgoingCall: null,
  pendingRespond: null,
  endCallSignal: 0,
  setIncomingCall: (call) => set({ incomingCall: call }),
  setOutgoingCall: (call) => set({ outgoingCall: call }),
  setOutgoingCallId: (callId) =>
    set((state) => ({
      outgoingCall: state.outgoingCall
        ? { ...state.outgoingCall, callId }
        : null,
    })),
  markOutgoingAnswered: () =>
    set((state) => ({
      outgoingCall: state.outgoingCall
        ? { ...state.outgoingCall, answered: true }
        : null,
    })),
  setPendingRespond: (pending) => set({ pendingRespond: pending }),
  clearIncomingCall: () => set({ incomingCall: null }),
  clearOutgoingCall: () => set({ outgoingCall: null }),
  clearAll: () =>
    set({
      incomingCall: null,
      outgoingCall: null,
      pendingRespond: null,
    }),
  signalEndCall: () =>
    set((state) => ({ endCallSignal: state.endCallSignal + 1 })),
  resetEndCallSignal: () => set({ endCallSignal: 0 }),
}));
