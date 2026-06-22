/** Drop stale optimistic E2EE bubbles when a confirmed server message exists nearby. */
export function removeStaleOptimisticE2EEMessages(
  messages: Message[],
  currentUserId: string,
): Message[] {
  if (!messages.length) return messages;

  const confirmedSelfE2EE = messages.filter(
    (m) =>
      m.message_type === "e2ee_text" &&
      m.sender_id === currentUserId &&
      m.status === "sent",
  );

  if (!confirmedSelfE2EE.length) return messages;

  return messages.filter((msg) => {
    if (msg.message_type !== "e2ee_text" || msg.sender_id !== currentUserId) {
      return true;
    }
    if (msg.status === "sent") return true;
    if (msg.status !== "pending" && msg.status !== "sending" && msg.status) {
      return true;
    }

    const msgTime = new Date(msg.created_at || 0).getTime();
    if (Number.isNaN(msgTime)) return true;

    const hasNearbyConfirmed = confirmedSelfE2EE.some((confirmed) => {
      const confirmedTime = new Date(confirmed.created_at || 0).getTime();
      if (Number.isNaN(confirmedTime)) return false;
      return Math.abs(confirmedTime - msgTime) < 60_000;
    });

    return !hasNearbyConfirmed;
  });
}

export function dedupeMessagesById(messages: Message[]): Message[] {
  const seen = new Set<string>();
  const result: Message[] = [];

  for (const msg of messages) {
    if (!msg.id || seen.has(msg.id)) continue;
    seen.add(msg.id);
    result.push(msg);
  }

  return result;
}
