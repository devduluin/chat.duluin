import { useChatStore } from "@/store/useChatStore";
import type { WsHandlerContext } from "../../types";

export function handleTyping(
  msg: Message,
  messageType: string,
  _ctx: WsHandlerContext,
): boolean {
  if (messageType !== "typing_started" && messageType !== "typing_stopped") {
    return false;
  }

  try {
    const typingData = JSON.parse(msg.content);
    console.log(`✍️ TYPING EVENT (${messageType}):`, typingData.user_name);

    if (useChatStore.getState().setTypingStatus) {
      useChatStore.getState().setTypingStatus(
        msg.conversation_id,
        typingData.user_id,
        messageType === "typing_started",
        typingData.user_name,
      );
    }
  } catch (e) {
    console.error("Failed to parse typing event", e);
  }

  return true;
}
