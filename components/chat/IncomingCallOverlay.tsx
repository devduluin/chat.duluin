"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useCallStore } from "@/store/useCallStore";
import { acceptCall, rejectCall } from "@/lib/callSignaling";
import { useContactsStore } from "@/store/useContactStore";

export function IncomingCallOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const incomingCall = useCallStore((s) => s.incomingCall);
  const clearIncomingCall = useCallStore((s) => s.clearIncomingCall);
  const setPendingRespond = useCallStore((s) => s.setPendingRespond);
  const contacts = useContactsStore((s) => s.contacts);

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === "video";
  const conversationPath = `/conversation/${incomingCall.conversationId}`;
  const isOnConversation = pathname === conversationPath;

  const resolveCallerName = () => {
    if (incomingCall.callerName) return incomingCall.callerName;
    const found = contacts?.find((c) => {
      const targetId =
        c.target?.id || (c as any).target_id || (c as any).TargetID;
      return targetId === incomingCall.callerId;
    });
    if (found) {
      const firstName =
        (found as any).first_name ||
        (found as any).FirstName ||
        found.target?.first_name ||
        "";
      const lastName =
        (found as any).last_name ||
        (found as any).LastName ||
        found.target?.last_name ||
        "";
      const name = `${firstName} ${lastName}`.trim();
      if (name) return name;
    }
    return "Seseorang";
  };

  const handleAccept = () => {
    const pending = {
      callType: incomingCall.callType,
      peerId: incomingCall.callerId,
      callId: incomingCall.callId,
    };

    acceptCall(incomingCall.callerId, incomingCall.callId);
    clearIncomingCall();
    setPendingRespond(pending);

    if (!isOnConversation) {
      router.push(
        `${conversationPath}?accept_call=true&call_type=${incomingCall.callType}`,
      );
    }
  };

  const handleReject = () => {
    rejectCall(incomingCall.callerId, incomingCall.callId);
    clearIncomingCall();
  };

  const callerName = resolveCallerName();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-lg"
      >
        <div className="relative w-full max-w-md p-8 mx-4 bg-gray-900/90 border border-gray-800 rounded-3xl shadow-2xl flex flex-col items-center text-center">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
            {isVideo ? (
              <Video className="h-10 w-10 text-emerald-400 animate-pulse" />
            ) : (
              <Phone className="h-10 w-10 text-emerald-400 animate-pulse" />
            )}
          </div>

          <p className="text-sm font-medium text-emerald-400 uppercase tracking-wider mb-2">
            {isVideo ? "Panggilan Video Masuk" : "Panggilan Suara Masuk"}
          </p>
          <h3 className="text-2xl font-bold text-white mb-8">{callerName}</h3>

          <div className="flex items-center justify-center gap-8 w-full">
            <button
              onClick={handleReject}
              className="flex flex-col items-center gap-2 group"
              aria-label="Tolak panggilan"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30">
                <PhoneOff className="h-7 w-7 text-white" />
              </span>
              <span className="text-sm text-gray-400 group-hover:text-gray-300">
                Tolak
              </span>
            </button>

            <button
              onClick={handleAccept}
              className="flex flex-col items-center gap-2 group"
              aria-label="Terima panggilan"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30 animate-pulse">
                {isVideo ? (
                  <Video className="h-7 w-7 text-white" />
                ) : (
                  <Phone className="h-7 w-7 text-white" />
                )}
              </span>
              <span className="text-sm text-gray-400 group-hover:text-gray-300">
                Terima
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
