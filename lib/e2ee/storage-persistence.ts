const E2EE_KEY_PREFIXES = [
  "e2ee_device_id_",
  "e2ee_store_",
  "e2ee_sent_plaintext_",
  "e2ee_received_plaintext_",
] as const;

export function isE2EEPersistentKey(key: string): boolean {
  return E2EE_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

/** Clear auth/app localStorage but keep E2EE keys and plaintext caches on this device. */
export function clearAuthLocalStoragePreservingE2EE(): void {
  if (typeof window === "undefined") return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !isE2EEPersistentKey(key)) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}
