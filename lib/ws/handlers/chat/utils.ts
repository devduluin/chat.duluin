import type { RefValue } from "../../types";

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
