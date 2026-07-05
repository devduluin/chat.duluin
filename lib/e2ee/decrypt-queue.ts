const decryptChains = new Map<string, Promise<unknown>>();

function chainKey(conversationId: string, peerUserId: string): string {
  return `${conversationId}:${peerUserId}`;
}

/** Signal ratchet requires decrypting messages from the same peer in order. */
export function serializePeerDecrypt<T>(
  conversationId: string,
  peerUserId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const key = chainKey(conversationId, peerUserId);
  const tail = decryptChains.get(key) ?? Promise.resolve();

  const run = tail.catch(() => undefined).then(() => operation());

  decryptChains.set(
    key,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );

  return run;
}
