import { useChatStore } from "@/store/useChatStore";
import type { WsHandlerContext } from "../../types";

export function handleMessageRead(
  msg: Message,
  messageType: string,
  ctx: WsHandlerContext,
): boolean {
  if (messageType !== "message_read") return false;

  try {
    const readData = JSON.parse(msg.content);
    console.log("👁️ MESSAGE READ EVENT:", readData);

    const readAt = readData.read_at ? new Date(readData.read_at) : new Date();
    if (readData.user_id && readData.user_id !== ctx.userId) {
      useChatStore.getState().updateMessagesReadUpToMessage(
        msg.conversation_id,
        ctx.userId,
        readData.message_id,
        readAt,
      );
    } else {
      useChatStore.getState().updateMessageReadStatus(
        readData.message_id,
        msg.conversation_id,
        readAt,
      );
    }
  } catch (e) {
    console.error("Failed to parse message_read event", e);
  }

  return true;
}
