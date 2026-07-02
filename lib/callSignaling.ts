import { useWebSocketStore } from "@/store/useWebSocketStore";
import { useCallStore, type IncomingCall } from "@/store/useCallStore";

export type CallType = "voice" | "video";

export interface CallSignalingPayload {
  type: string;
  receiver_id: string;
  call_type?: CallType;
  conversation_id?: string;
  call_id?: string;
}

export function sendCallSignaling(payload: CallSignalingPayload): boolean {
  const sendMessage = useWebSocketStore.getState().sendMessage;
  if (!sendMessage) {
    console.warn("WebSocket sendMessage not available for call signaling");
    return false;
  }
  return sendMessage(payload);
}

export function initiateCall(
  receiverId: string,
  callType: CallType,
  conversationId: string,
): boolean {
  return sendCallSignaling({
    type: "call_initiate",
    receiver_id: receiverId,
    call_type: callType,
    conversation_id: conversationId,
  });
}

export function acceptCall(receiverId: string, callId: string): boolean {
  return sendCallSignaling({
    type: "call_accept",
    receiver_id: receiverId,
    call_id: callId,
  });
}

export function rejectCall(receiverId: string, callId: string): boolean {
  return sendCallSignaling({
    type: "call_reject",
    receiver_id: receiverId,
    call_id: callId,
  });
}

export function endCall(receiverId: string, callId: string): boolean {
  return sendCallSignaling({
    type: "call_end",
    receiver_id: receiverId,
    call_id: callId,
  });
}

const CALL_EVENTS = new Set([
  "call_initiate",
  "call_accept",
  "call_reject",
  "call_end",
  "call_busy",
]);

export function isCallSignalingEvent(eventType: string): boolean {
  return CALL_EVENTS.has(eventType);
}

export function handleCallSignalingEvent(
  eventType: string,
  data: Record<string, unknown> | null | undefined,
  options?: {
    onIncomingCall?: (call: IncomingCall) => void;
    playIncomingRing?: () => void;
  },
): void {
  if (!data) return;

  const store = useCallStore.getState();

  switch (eventType) {
    case "call_initiate": {
      const callerId = String(data.sender_id || "");
      const conversationId = String(data.conversation_id || "");
      const callId = String(data.call_id || "");
      const callType: CallType =
        data.call_type === "video" ? "video" : "voice";
      if (!callerId || !conversationId) return;

      const incoming: IncomingCall = {
        callId,
        callerId,
        callerName:
          typeof data.caller_name === "string" ? data.caller_name : undefined,
        callType,
        conversationId,
      };
      store.setIncomingCall(incoming);
      options?.playIncomingRing?.();
      options?.onIncomingCall?.(incoming);
      break;
    }
    case "call_accept": {
      const callId = data.call_id ? String(data.call_id) : undefined;
      if (callId) store.setOutgoingCallId(callId);
      store.markOutgoingAnswered();
      break;
    }
    case "call_reject":
    case "call_busy":
      store.clearOutgoingCall();
      store.signalEndCall();
      break;
    case "call_end":
      store.clearIncomingCall();
      store.clearOutgoingCall();
      store.signalEndCall();
      break;
  }
}
