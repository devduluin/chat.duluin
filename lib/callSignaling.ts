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
  const canStart = useCallStore.getState().tryBeginOutgoingCall({
    receiverId,
    callType,
    conversationId,
  });

  if (!canStart) {
    return false;
  }

  const sent = sendCallSignaling({
    type: "call_initiate",
    receiver_id: receiverId,
    call_type: callType,
    conversation_id: conversationId,
  });

  if (!sent) {
    useCallStore.getState().clearOutgoingCall();
    return false;
  }

  return true;
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

function resolveCallType(value: unknown): CallType {
  return value === "video" ? "video" : "voice";
}

function matchesActiveCall(
  eventType: string,
  data: Record<string, unknown>,
): boolean {
  const store = useCallStore.getState();
  const outgoing = store.outgoingCall;
  const incoming = store.incomingCall;
  const senderId = data.sender_id ? String(data.sender_id) : "";
  const conversationId = data.conversation_id
    ? String(data.conversation_id)
    : undefined;

  if (eventType === "call_busy") {
    return !!outgoing;
  }

  if (!outgoing && !incoming) {
    return false;
  }

  if (eventType === "call_end" || eventType === "call_reject") {
    const callId = data.call_id ? String(data.call_id) : "";
    if (callId) {
      if (outgoing?.callId === callId || incoming?.callId === callId) {
        return true;
      }
    }

    const matchesOutgoing =
      !!outgoing &&
      (!conversationId || outgoing.conversationId === conversationId) &&
      (!senderId || outgoing.receiverId === senderId);
    const matchesIncoming =
      !!incoming &&
      (!conversationId || incoming.conversationId === conversationId) &&
      (!senderId || incoming.callerId === senderId);
    return matchesOutgoing || matchesIncoming;
  }

  return !!(outgoing || incoming);
}

export function handleCallSignalingEvent(
  eventType: string,
  data: Record<string, unknown> | null | undefined,
  options?: {
    currentUserId?: string;
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
      const callType = resolveCallType(data.call_type);

      if (!callerId || !conversationId) return;
      if (options?.currentUserId && callerId === options.currentUserId) {
        console.warn("Ignoring self-echoed call_initiate event");
        return;
      }
      if (store.outgoingCall?.conversationId === conversationId) {
        console.warn("Ignoring call_initiate while already calling this chat");
        return;
      }

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
      const conversationId = data.conversation_id
        ? String(data.conversation_id)
        : store.outgoingCall?.conversationId;
      const callType = resolveCallType(
        data.call_type || store.outgoingCall?.callType,
      );
      const callId = data.call_id ? String(data.call_id) : undefined;

      if (!store.outgoingCall) break;

      if (callId) store.setOutgoingCallId(callId);
      store.markOutgoingAnswered();
      break;
    }
    case "call_reject":
    case "call_busy":
    case "call_end": {
      if (!matchesActiveCall(eventType, data)) {
        console.warn(`Ignoring unrelated ${eventType} event`, data);
        break;
      }

      const conversationId =
        (data.conversation_id ? String(data.conversation_id) : undefined) ||
        store.outgoingCall?.conversationId ||
        store.incomingCall?.conversationId;
      const callType = resolveCallType(
        data.call_type ||
          store.outgoingCall?.callType ||
          store.incomingCall?.callType,
      );

      store.clearIncomingCall();
      store.clearOutgoingCall();
      store.signalEndCall({
        conversationId,
        callType,
        reason: eventType,
      });
      break;
    }
  }
}
