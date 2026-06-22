import { processIncomingE2EEMessage } from "./message-crypto";
import { getReceivedPlaintext } from "./decrypted-plaintext-cache";
import {
  getSentPlaintext,
  isEncryptedPlaceholder,
  looksLikeCiphertext,
} from "./sent-plaintext-cache";

/** Fast sync preview for list UI — uses caches, never shows raw ciphertext. */
export function getE2EEMessagePreview(
  msg: Message,
  currentUserId: string,
): string {
  if (!msg || msg.message_type !== "e2ee_text") {
    return msg?.content ?? "";
  }

  if (msg.sender_id === currentUserId) {
    const cached = getSentPlaintext(msg.id);
    if (cached) return cached;
  } else {
    const cached = getReceivedPlaintext(msg.id);
    if (cached) return cached;
  }

  if (
    msg.content &&
    !isEncryptedPlaceholder(msg.content) &&
    !looksLikeCiphertext(msg.content)
  ) {
    return msg.content;
  }

  return "🔒 Encrypted message";
}

export async function resolveMessageForDisplay(
  msg: Message,
  currentUserId: string,
  options?: { existingPlaintext?: string },
): Promise<Message> {
  if (!msg || msg.message_type !== "e2ee_text") {
    return msg;
  }

  return processIncomingE2EEMessage(msg, currentUserId, {
    senderPlaintext:
      msg.sender_id === currentUserId
        ? options?.existingPlaintext ?? getE2EEMessagePreview(msg, currentUserId)
        : undefined,
    existingPlaintext:
      msg.sender_id !== currentUserId ? options?.existingPlaintext : undefined,
  });
}

export async function resolveConversationLastMessages(
  conversations: RecentConversation[],
  currentUserId: string,
): Promise<RecentConversation[]> {
  if (!currentUserId || !conversations.length) {
    return conversations;
  }

  return Promise.all(
    conversations.map(async (item) => {
      if (!item.LastMessage) return item;

      const resolved = await resolveMessageForDisplay(
        item.LastMessage,
        currentUserId,
        {
          existingPlaintext: getE2EEMessagePreview(item.LastMessage, currentUserId),
        },
      );

      if (resolved.content === item.LastMessage.content) {
        return item;
      }

      return { ...item, LastMessage: resolved };
    }),
  );
}
