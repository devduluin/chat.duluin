import { processIncomingE2EEMessage } from "@/lib/e2ee/message-crypto";
import { remapSentPlaintext, cacheSentPlaintext } from "@/lib/e2ee/sent-plaintext-cache";
import { useChatStore } from "@/store/useChatStore";

export async function preprocessE2eeMessage(
  msg: Message,
  messageType: string,
  userId: string,
): Promise<Message> {
  if (messageType !== "e2ee_text") {
    return msg;
  }

  const convMsgs = useChatStore.getState().messages[msg.conversation_id] || [];
  const optimisticMessage = convMsgs
    .filter(
      (m) =>
        m.sender_id === userId &&
        m.conversation_id === msg.conversation_id &&
        m.message_type === "e2ee_text" &&
        m.id !== msg.id &&
        (m.status === "pending" || m.status === "sending" || !m.status),
    )
    .sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    )[0];

  let processed = await processIncomingE2EEMessage(msg, userId, {
    senderPlaintext: optimisticMessage?.content,
  });

  if (optimisticMessage && processed.sender_id === userId) {
    remapSentPlaintext(optimisticMessage.id, processed.id);
    if (optimisticMessage.content) {
      cacheSentPlaintext(processed.id, optimisticMessage.content);
    }
  }

  return processed;
}
