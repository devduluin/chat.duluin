import { useChatStore } from "@/store/useChatStore";

export function handleLegacySystemDelete(msg: Message): boolean {
  if (!msg.content?.startsWith("message_deleted:")) {
    return false;
  }

  const parts = msg.content.split(":");
  const deletedMessageId = parts[1];
  useChatStore.getState().removeMessage(msg.conversation_id, deletedMessageId);
  return true;
}
