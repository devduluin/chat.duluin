import { useChatStore } from "@/store/useChatStore";
import type { WsHandlerContext } from "../../types";

export function handleMessageDeleted(
  msg: Message,
  messageType: string,
  _ctx: WsHandlerContext,
): boolean {
  if (messageType !== "message_deleted") return false;

  let deletedMessageId = msg.id;
  let deleteForEveryone = false;

  try {
    const eventData = JSON.parse(msg.content);
    deletedMessageId = eventData.message_id || msg.id;
    deleteForEveryone = eventData.delete_for_everyone;
  } catch {
    if (msg.content?.startsWith("message_deleted:")) {
      const parts = msg.content.split(":");
      deletedMessageId = parts[1];
      deleteForEveryone = parts[2] === "true";
    }
  }

  console.log("🗑️🔥 DELETE EVENT DETECTED!", {
    deletedMessageId,
    conversationId: msg.conversation_id,
    deleteForEveryone,
  });

  useChatStore.getState().removeMessage(msg.conversation_id, deletedMessageId);
  return true;
}
