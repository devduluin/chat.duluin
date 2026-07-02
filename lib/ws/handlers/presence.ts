import { useContactsStore } from "@/store/useContactStore";
import { useConversationsStore } from "@/store/useConversationsStore";
import type { WsResponse } from "../types";

export function handlePresenceEvent(response: WsResponse): boolean {
  if (response.message !== "user_presence") return false;

  const presence = response.data as {
    user_id?: string;
    status?: string;
    last_seen_at?: string;
  };

  if (presence?.user_id) {
    console.log("🟢 [Presence DEBUG] Presence update received:", presence);

    const currentConvs = useConversationsStore.getState().conversations;
    console.log(
      "📋 [Presence DEBUG] Current conversations in store:",
      currentConvs.map((c) => ({
        id: c.Conversation.id,
        name: c.Conversation.name,
        other_user_id: (c as any).other_user_id,
        status: c.Conversation.status,
      })),
    );

    const currentContacts = useContactsStore.getState().contacts;
    console.log(
      "👥 [Presence DEBUG] Current contacts in store:",
      currentContacts.map((c) => ({
        id: c.id,
        name: c.first_name || c.target?.first_name,
        target_id: c.target?.id || c.target_id || c.TargetID,
        status: c.target?.status,
      })),
    );

    useContactsStore
      .getState()
      .updateContactStatus(
        presence.user_id,
        presence.status ?? "offline",
        presence.last_seen_at ?? "",
      );
    useConversationsStore
      .getState()
      .updateConversationUserStatus(
        presence.user_id,
        presence.status ?? "offline",
      );

    const updatedConvs = useConversationsStore.getState().conversations;
    console.log(
      "✅ [Presence DEBUG] Updated conversations in store:",
      updatedConvs.map((c) => ({
        id: c.Conversation.id,
        name: c.Conversation.name,
        other_user_id: (c as any).other_user_id,
        status: c.Conversation.status,
      })),
    );
  }

  return true;
}
