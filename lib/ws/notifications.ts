import { toast } from "sonner";
import { useAccountStore } from "@/store/useAccountStore";
import { useContactsStore } from "@/store/useContactStore";
import type { RefValue } from "./types";

export function playNotificationSound(): void {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioCtx.currentTime;

    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(783.99, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1046.5, now + 0.1);
    gain2.gain.setValueAtTime(0.15, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);
  } catch (e) {
    console.error("Audio Context failed to play chime:", e);
  }
}

export function playIncomingCallSound(ringState: RefValue<boolean>): void {
  if (ringState.current) return;
  ringState.current = true;

  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioCtx.currentTime;

    const playRing = (startOffset: number) => {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(440, now + startOffset);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(480, now + startOffset);

      gainNode.gain.setValueAtTime(0, now + startOffset);
      gainNode.gain.linearRampToValueAtTime(0.15, now + startOffset + 0.05);
      gainNode.gain.setValueAtTime(0.15, now + startOffset + 1.2);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + startOffset + 1.5);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start(now + startOffset);
      osc2.start(now + startOffset);
      osc1.stop(now + startOffset + 1.5);
      osc2.stop(now + startOffset + 1.5);
    };

    playRing(0);
    playRing(2);

    setTimeout(() => {
      ringState.current = false;
    }, 4000);
  } catch (e) {
    console.error("Audio Context failed to play ring:", e);
    ringState.current = false;
  }
}

export function showDesktopNotification(
  title: string,
  body: string,
  iconUrl?: string,
): void {
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      const notification = new Notification(title, {
        body,
        icon: iconUrl || "/favicon.ico",
        silent: true,
      });
      notification.onclick = () => {
        window.focus();
      };
    } catch (e) {
      console.error("Desktop notification failed:", e);
    }
  }
}

function resolveSenderName(msg: Message): string {
  let senderName = "Seseorang";
  if (!msg.sender) return senderName;

  try {
    const { contacts } = useContactsStore.getState();
    const found = contacts?.find((c) => {
      const targetId = c.target?.id || (c as any).target_id || (c as any).TargetID;
      return targetId && targetId === msg.sender_id;
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
      if (firstName || lastName) {
        senderName = `${firstName} ${lastName}`.trim();
      }
    }
  } catch {
    // ignore contact lookup errors
  }

  if (senderName === "Seseorang") {
    senderName =
      `${msg.sender.first_name || ""} ${msg.sender.last_name || ""}`.trim() ||
      "Seseorang";
  }

  return senderName;
}

export function shouldNotifyMessage(msg: Message, userId: string): boolean {
  if (!msg || msg.sender_id === userId) return false;

  const accountData = useAccountStore.getState().data;
  const notificationPrefs = accountData?.settings?.notification_prefs;
  return notificationPrefs?.push !== false;
}

export function createNotificationTrigger(
  userId: string,
  ringState: RefValue<boolean>,
): (msg: Message) => void {
  return (msg: Message) => {
    if (!shouldNotifyMessage(msg, userId)) return;

    const isSystem = msg.message_type === "system" || msg.is_system_message;
    const content = typeof msg.content === "string" ? msg.content : "";
    const isCall = content.startsWith("📞 Panggilan suara aktif");
    const isVideoCall = content.startsWith("📹 Panggilan video aktif");
    const isCallEnd =
      content.startsWith("📞 Suara panggilan berakhir") ||
      content.startsWith("📞 Panggilan suara berakhir") ||
      content.startsWith("📹 Video panggilan berakhir");

    if (isCall || isVideoCall) {
      playIncomingCallSound(ringState);
    } else if (!isCallEnd) {
      playNotificationSound();
    }

    const senderName = resolveSenderName(msg);

    let notificationTitle = "Pesan Baru";
    let notificationBody = content;

    if (isCall) {
      notificationTitle = "📞 Panggilan Suara Masuk";
      notificationBody = `Panggilan suara aktif dari ${senderName}. Klik untuk bergabung!`;
    } else if (isVideoCall) {
      notificationTitle = "📹 Panggilan Video Masuk";
      notificationBody = `Panggilan video aktif dari ${senderName}. Klik untuk bergabung!`;
    } else if (isSystem) {
      notificationTitle = "Notifikasi Grup";
      if (content.startsWith("member_added:")) {
        const parts = content.split(":");
        notificationBody = `${parts[2] || "Seseorang"} bergabung ke grup`;
      } else if (content.startsWith("member_exit:")) {
        const parts = content.split(":");
        notificationBody = `${parts[2] || "Seseorang"} keluar dari grup`;
      } else {
        notificationBody = content;
      }
    } else {
      notificationTitle = `Pesan dari ${senderName}`;
    }

    showDesktopNotification(
      notificationTitle,
      notificationBody,
      msg.sender?.avatar_url ?? undefined,
    );

    if (isCall) {
      toast.info(notificationTitle, {
        description: notificationBody,
        action: {
          label: "Gabung",
          onClick: () => {
            window.location.href = `/conversation/${msg.conversation_id}?start_call=true`;
          },
        },
        duration: 15000,
        position: "top-center",
      });
    } else if (isVideoCall) {
      toast.info(notificationTitle, {
        description: notificationBody,
        action: {
          label: "Gabung",
          onClick: () => {
            window.location.href = `/conversation/${msg.conversation_id}?start_video_call=true`;
          },
        },
        duration: 15000,
        position: "top-center",
      });
    } else {
      toast(notificationTitle, {
        description: notificationBody,
        action: {
          label: "Buka",
          onClick: () => {
            window.location.href = `/conversation/${msg.conversation_id}`;
          },
        },
        duration: 5000,
      });
    }
  };
}
