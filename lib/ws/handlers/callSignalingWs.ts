import { toast } from "sonner";
import {
  acceptCall,
  handleCallSignalingEvent,
  isCallSignalingEvent,
} from "@/lib/callSignaling";
import { useCallStore, type IncomingCall } from "@/store/useCallStore";
import type { WsHandlerContext, WsResponse } from "../types";

export function handleCallSignalingWsEvent(
  response: WsResponse,
  ctx: WsHandlerContext,
): boolean {
  if (!isCallSignalingEvent(response.message || "")) return false;

  const showIncomingCallToast = (call: IncomingCall) => {
    const callLabel =
      call.callType === "video" ? "Panggilan Video" : "Panggilan Suara";
    toast.info(`${callLabel} Masuk`, {
      description: "Klik Terima untuk menjawab panggilan.",
      action: {
        label: "Terima",
        onClick: () => {
          acceptCall(call.callerId, call.callId);
          useCallStore.getState().setPendingRespond({
            callType: call.callType,
            peerId: call.callerId,
            callId: call.callId,
          });
          useCallStore.getState().clearIncomingCall();
          window.location.href = `/conversation/${call.conversationId}?accept_call=true&call_type=${call.callType}`;
        },
      },
      duration: 20000,
      position: "top-center",
    });
  };

  handleCallSignalingEvent(response.message!, response.data as Record<string, unknown>, {
    currentUserId: ctx.userId,
    playIncomingRing: ctx.playIncomingCallSound,
    onIncomingCall: showIncomingCallToast,
  });

  if (response.message === "call_accept") {
    toast.success("Panggilan diterima!");
  } else if (response.message === "call_reject") {
    toast.info("Panggilan ditolak.");
  } else if (response.message === "call_busy") {
    toast.info("Pengguna sedang dalam panggilan lain.");
  } else if (response.message === "call_end") {
    ctx.ringState.current = false;
  }

  return true;
}
