const PREFIX = "e2ee_sent_plaintext_";

export function cacheSentPlaintext(messageId: string, plaintext: string) {
  if (typeof window === "undefined" || !messageId || !plaintext) return;
  localStorage.setItem(`${PREFIX}${messageId}`, plaintext);
}

export function getSentPlaintext(messageId: string): string | null {
  if (typeof window === "undefined" || !messageId) return null;
  return localStorage.getItem(`${PREFIX}${messageId}`);
}

export function remapSentPlaintext(oldMessageId: string, newMessageId: string) {
  if (!oldMessageId || !newMessageId || oldMessageId === newMessageId) return;
  const plaintext = getSentPlaintext(oldMessageId);
  if (!plaintext) return;
  cacheSentPlaintext(newMessageId, plaintext);
  localStorage.removeItem(`${PREFIX}${oldMessageId}`);
}

export function isEncryptedPlaceholder(content: string): boolean {
  return (
    content === "🔒 Encrypted message" ||
    content === "🔒 Unable to decrypt this message"
  );
}
