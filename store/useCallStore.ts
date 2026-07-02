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

export interface EndCallSignal {
  id: number;
  conversationId?: string;
  callType?: CallType;
  reason?: string;
}

interface CallStore {
  incomingCall: IncomingCall | null;
  outgoingCall: OutgoingCall | null;
  pendingRespond: PendingRespond | null;
  endCallSignal: EndCallSignal;
  outgoingInitiateKey: string | null;
  outgoingInitiateAt: number;
  setIncomingCall: (call: IncomingCall | null) => void;
  setOutgoingCall: (call: OutgoingCall | null) => void;
  setOutgoingCallId: (callId: string) => void;
  markOutgoingAnswered: () => void;
  setPendingRespond: (pending: PendingRespond | null) => void;
  tryBeginOutgoingCall: (params: {
    receiverId: string;
    callType: CallType;
    conversationId: string;
  }) => boolean;
  clearIncomingCall: () => void;
  clearOutgoingCall: () => void;
  clearAll: () => void;
  signalEndCall: (meta?: Omit<EndCallSignal, "id">) => void;
  resetEndCallSignal: () => void;
}

const OUTGOING_INITIATE_DEDUP_MS = 8000;

export const useCallStore = create<CallStore>((set, get) => ({
  incomingCall: null,
  outgoingCall: null,
  pendingRespond: null,
  endCallSignal: { id: 0 },
  outgoingInitiateKey: null,
  outgoingInitiateAt: 0,
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
  tryBeginOutgoingCall: ({ receiverId, callType, conversationId }) => {
    const now = Date.now();
    const key = `${conversationId}:${receiverId}:${callType}`;
    const state = get();

    if (
      state.outgoingCall?.conversationId === conversationId &&
      !state.outgoingCall.answered
    ) {
      console.warn("Duplicate call_initiate blocked: outgoing call already active");
      return false;
    }

    if (
      state.outgoingInitiateKey === key &&
      now - state.outgoingInitiateAt < OUTGOING_INITIATE_DEDUP_MS
    ) {
      console.warn("Duplicate call_initiate blocked: same call recently initiated");
      return false;
    }

    if (
      state.outgoingInitiateKey?.startsWith(`${conversationId}:`) &&
      now - state.outgoingInitiateAt < 3000
    ) {
      console.warn(
        "Duplicate call_initiate blocked: another call just started in this chat",
      );
      return false;
    }

    set({
      outgoingCall: {
        receiverId,
        callType,
        conversationId,
        answered: false,
      },
      outgoingInitiateKey: key,
      outgoingInitiateAt: now,
      incomingCall: null,
      pendingRespond: null,
    });
    return true;
  },
  clearIncomingCall: () => set({ incomingCall: null }),
  clearOutgoingCall: () =>
    set({
      outgoingCall: null,
      outgoingInitiateKey: null,
      outgoingInitiateAt: 0,
    }),
  clearAll: () =>
    set({
      incomingCall: null,
      outgoingCall: null,
      pendingRespond: null,
      outgoingInitiateKey: null,
      outgoingInitiateAt: 0,
    }),
  signalEndCall: (meta) =>
    set((state) => ({
      endCallSignal: {
        id: state.endCallSignal.id + 1,
        conversationId: meta?.conversationId,
        callType: meta?.callType,
        reason: meta?.reason,
      },
    })),
  resetEndCallSignal: () => set({ endCallSignal: { id: 0 } }),
}));
