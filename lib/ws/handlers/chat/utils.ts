import type { RefValue } from "../../types";
import { getSentPlaintext } from "@/lib/e2ee/sent-plaintext-cache";
import { looksLikeCiphertext } from "@/lib/e2ee/sent-plaintext-cache";

export function isUnconfirmedOutboundMessage(msg: Message): boolean {
  return (
    msg.status === "pending" ||
    msg.status === "sending" ||
    msg.status === undefined ||
    msg.status === null
  );
}

/** Find local optimistic bubble to replace when server ack/broadcast arrives. */
export function findOutboundOptimisticMessage(
  convMsgs: Message[],
  msg: Message,
  userId: string,
): Message | undefined {
  if (msg.sender_id !== userId) return undefined;

  const candidates = convMsgs.filter(
    (m) =>
      m.sender_id === userId &&
      m.conversation_id === msg.conversation_id &&
      m.id !== msg.id &&
      isUnconfirmedOutboundMessage(m),
  );

  if (candidates.length === 0) return undefined;

  const sentPlaintext = getSentPlaintext(msg.id);
  if (sentPlaintext) {
    const byPlaintext = candidates.find((m) => m.content === sentPlaintext);
    if (byPlaintext) return byPlaintext;
  }

  if (msg.content && !looksLikeCiphertext(msg.content)) {
    const byContent = candidates.find((m) => m.content === msg.content);
    if (byContent) return byContent;
  }

  return candidates.sort(
    (a, b) =>
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime(),
  )[0];
}

export function shouldSkipDedupe(
  processedMessageIds: RefValue<Record<string, number>>,
  key: string,
  windowMs = 5000,
): boolean {
  const now = Date.now();
  const lastProcessed = processedMessageIds.current[key];
  if (lastProcessed && now - lastProcessed < windowMs) {
    return true;
  }
  processedMessageIds.current[key] = now;
  return false;
}

export function normalizeMessageType(msg: Message): string {
  return msg.message_type || (msg as any).MessageType || "";
}

const EPHEMERAL_RELAY_MESSAGE_TYPES = new Set([
  "message_delivered",
  "message_read",
  "message_deleted",
  "typing_started",
  "typing_stopped",
]);

export function isEphemeralRelayMessage(msg: Message): boolean {
  return EPHEMERAL_RELAY_MESSAGE_TYPES.has(normalizeMessageType(msg));
}
