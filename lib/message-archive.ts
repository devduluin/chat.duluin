import { useChatStore } from "@/store/useChatStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import { useWebSocketStore } from "@/store/useWebSocketStore";

const DB_NAME = "duluin-chat-archive";
const DB_VERSION = 1;
const STORE = "messages";

const AI_BOT_USER_ID = "1196e18b-c1dc-41aa-946a-0c55e9d64fe6";

const RELAY_TRACKABLE_TYPES = new Set([
  "text",
  "e2ee_text",
  "image",
  "file",
  "audio",
  "video",
  "document",
]);

function messageTime(m: Message): number {
  const t = m.created_at;
  return t ? new Date(t).getTime() : 0;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("conversation_id", "conversation_id", {
          unique: false,
        });
        store.createIndex("created_at", "created_at", { unique: false });
      }
    };
  });
}

export function isRelayTrackableMessage(msg: Message): boolean {
  const type = msg.message_type || (msg as any).MessageType || "";
  return RELAY_TRACKABLE_TYPES.has(type);
}

export function isAIConversation(conversationId: string): boolean {
  const chatConv = useChatStore.getState().conversations[conversationId] as any;
  if (chatConv?.name === "AI Assistant") return true;
  const members = chatConv?.members || [];
  if (members.some((m: any) => m.user_id === AI_BOT_USER_ID)) return true;

  const sidebar = useConversationsStore
    .getState()
    .conversations.find((c) => c.Conversation?.id === conversationId);
  if (sidebar?.Conversation?.name === "AI Assistant") return true;
  return false;
}

export async function archiveUpsertMessage(msg: Message): Promise<void> {
  if (!msg?.id || !msg.conversation_id || !isRelayTrackableMessage(msg)) return;
  if (isAIConversation(msg.conversation_id)) return;

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(msg);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn("message-archive upsert failed:", e);
  }
}

export async function archiveUpsertMessages(msgs: Message[]): Promise<void> {
  const trackable = msgs.filter(
    (m) =>
      m?.id &&
      m.conversation_id &&
      isRelayTrackableMessage(m) &&
      !isAIConversation(m.conversation_id),
  );
  if (trackable.length === 0) return;

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const msg of trackable) {
        store.put(msg);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn("message-archive batch upsert failed:", e);
  }
}

export async function archiveDeleteMessage(messageId: string): Promise<void> {
  if (!messageId) return;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(messageId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn("message-archive delete failed:", e);
  }
}

export async function archiveDeleteByConversation(
  conversationId: string,
): Promise<void> {
  if (!conversationId) return;
  try {
    const existing = await archiveGetByConversation(conversationId);
    if (existing.length === 0) return;

    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const msg of existing) {
        if (msg.id) store.delete(msg.id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (e) {
    console.warn("message-archive clear conversation failed:", e);
  }
}

export async function archiveGetByConversation(
  conversationId: string,
): Promise<Message[]> {
  if (!conversationId) return [];
  try {
    const db = await openDB();
    const rows = await new Promise<Message[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const index = tx.objectStore(STORE).index("conversation_id");
      const req = index.getAll(conversationId);
      req.onsuccess = () => resolve((req.result as Message[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rows.sort((a, b) => messageTime(a) - messageTime(b));
  } catch (e) {
    console.warn("message-archive read failed:", e);
    return [];
  }
}

export function mergeArchiveWithServer(
  archive: Message[],
  server: Message[],
): Message[] {
  const map = new Map<string, Message>();

  for (const m of archive) {
    if (m?.id) map.set(m.id, m);
  }

  for (const m of server) {
    if (!m?.id) continue;
    const prev = map.get(m.id);
    if (!prev) {
      map.set(m.id, m);
      continue;
    }
    map.set(m.id, {
      ...prev,
      ...m,
      content:
        prev.content &&
        !prev.content.startsWith("🔒") &&
        (!m.content || m.content.startsWith("🔒"))
          ? prev.content
          : m.content || prev.content,
    });
  }

  return Array.from(map.values()).sort((a, b) => messageTime(a) - messageTime(b));
}

export function sendDeliveredAck(
  conversationId: string,
  messageId: string,
): boolean {
  if (isAIConversation(conversationId)) return false;
  const send = useWebSocketStore.getState().sendMessage;
  if (!send) return false;
  return send({
    type: "delivered",
    conversation_id: conversationId,
    message_id: messageId,
  });
}

export async function persistInboundRelayMessage(
  msg: Message,
  currentUserId: string,
): Promise<void> {
  if (!msg?.id || !msg.conversation_id) return;
  if (!isRelayTrackableMessage(msg)) return;
  if (msg.sender_id === currentUserId) {
    await archiveUpsertMessage(msg);
    return;
  }
  if (isAIConversation(msg.conversation_id)) return;

  await archiveUpsertMessage(msg);
  sendDeliveredAck(msg.conversation_id, msg.id);
}
