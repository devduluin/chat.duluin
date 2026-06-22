const PREFIX = "e2ee_received_plaintext_";

export function cacheReceivedPlaintext(messageId: string, plaintext: string) {
  if (typeof window === "undefined" || !messageId || !plaintext) return;
  localStorage.setItem(`${PREFIX}${messageId}`, plaintext);
}

export function getReceivedPlaintext(messageId: string): string | null {
  if (typeof window === "undefined" || !messageId) return null;
  return localStorage.getItem(`${PREFIX}${messageId}`);
}
